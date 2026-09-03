"use client";

import type {
  AgentPhase,
  Artifact,
  ChatMessage,
  ToolRun,
  ToolRunStatus,
} from "@/lib/types/agent";
import { uid } from "@/lib/utils";
import { create } from "zustand";

export interface SessionSummary {
  id: string;
  title: string;
  pinned?: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface NoteRow {
  id: string;
  title: string;
  content: string;
  tags: string;
  createdAt: number;
  updatedAt: number;
}

interface DeskState {
  sessionId: string | null;
  sessions: SessionSummary[];
  notes: NoteRow[];
  messages: ChatMessage[];
  toolRuns: ToolRun[];
  artifacts: Artifact[];
  phase: AgentPhase;
  streamingText: string;
  error: string | null;
  selectedArtifactId: string | null;
  apiKeyConfigured: boolean | null;
  runtimeError: string | null;
  notesOpen: boolean;
  sessionsOpen: boolean;
  shellView: "home" | "chat" | "settings";
  indexStats: {
    chunkCount: number;
    embeddingModel: string | null;
    remote: boolean;
  } | null;
  reindexing: boolean;
  abortController: AbortController | null;

  bootstrap: () => Promise<void>;
  refreshSessions: () => Promise<void>;
  refreshNotes: () => Promise<void>;
  refreshIndexStats: () => Promise<void>;
  reindexNotes: () => Promise<void>;
  loadSession: (id: string) => Promise<void>;
  newSession: () => Promise<void>;
  deleteSession: (id: string) => Promise<void>;
  renameSession: (id: string, title: string) => Promise<void>;
  togglePinSession: (id: string) => Promise<void>;
  exportSession: (id: string) => Promise<void>;
  importSession: (file: File) => Promise<void>;
  sendMessage: (text: string) => Promise<void>;
  stop: () => void;
  selectArtifact: (id: string | null) => void;
  selectCitation: (index: number) => void;
  approveToolRun: (toolRunId: string) => Promise<void>;
  rejectToolRun: (toolRunId: string) => Promise<void>;
  toggleTaskItem: (artifactId: string, itemId: string) => Promise<void>;
  createNote: (input: {
    title: string;
    content: string;
    tags?: string;
  }) => Promise<void>;
  updateNote: (input: {
    id: string;
    title?: string;
    content?: string;
    tags?: string;
  }) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  setNotesOpen: (open: boolean) => void;
  setSessionsOpen: (open: boolean) => void;
  setShellView: (view: "home" | "chat" | "settings") => void;
}

function upsertToolRun(list: ToolRun[], run: ToolRun) {
  const idx = list.findIndex((r) => r.id === run.id);
  if (idx === -1) return [...list, run];
  const next = list.slice();
  next[idx] = run;
  return next;
}

function patchToolStatus(
  list: ToolRun[],
  id: string,
  status: ToolRunStatus,
  extra?: Partial<ToolRun>,
) {
  return list.map((run) =>
    run.id === id ? { ...run, status, endedAt: Date.now(), ...extra } : run,
  );
}

function parseSseChunk(buffer: string) {
  const events: Array<{ event: string; data: string }> = [];
  const parts = buffer.split("\n\n");
  const rest = parts.pop() ?? "";
  for (const part of parts) {
    let event = "message";
    const dataLines: string[] = [];
    for (const line of part.split("\n")) {
      if (line.startsWith("event:")) event = line.slice(6).trim();
      if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
    }
    if (dataLines.length) {
      events.push({ event, data: dataLines.join("\n") });
    }
  }
  return { events, rest };
}

/**
 * DeskStore —— 全栈真相来源在服务端 SQLite。
 * 客户端负责流式订阅与乐观 UI；HITL / 勾选都回写 API。
 */
export const useDeskStore = create<DeskState>((set, get) => ({
  sessionId: null,
  sessions: [],
  notes: [],
  messages: [
    {
      id: uid("msg"),
      role: "assistant",
      content:
        "我是 Aether Desk。现已支持混合检索（关键词+向量）与引用角标 [1][2]。配置 DEEPSEEK/OPENAI Key 后可对话；向量可另配 EMBEDDING_API_KEY，否则使用 local-hash 兜底。试试：「用混合检索查 Agent Loop，并引用编号回答要点」。",
      createdAt: Date.now(),
    },
  ],
  toolRuns: [],
  artifacts: [],
  phase: "idle",
  streamingText: "",
  error: null,
  selectedArtifactId: null,
  apiKeyConfigured: null,
  runtimeError: null,
  notesOpen: false,
  sessionsOpen: false,
  shellView: "home",
  indexStats: null,
  reindexing: false,
  abortController: null,

  async bootstrap() {
    try {
      const res = await fetch("/api/health");
      const health = (await res.json().catch(() => ({}))) as {
        apiKeyConfigured?: boolean;
        error?: string;
        hint?: string;
        index?: { chunkCount?: number; embeddingModel?: string | null };
        embedding?: { model?: string; remote?: boolean };
      };

      if (!res.ok) {
        set({
          apiKeyConfigured: Boolean(health.apiKeyConfigured),
          runtimeError:
            [health.error, health.hint].filter(Boolean).join(" ") ||
            `健康检查失败 HTTP ${res.status}。若地址是 localhost:3001，请关掉旧进程后执行 npm run desk，只用 :3000。`,
        });
      } else {
        const warnings = Array.isArray(
          (health as { warnings?: string[] }).warnings,
        )
          ? ((health as { warnings?: string[] }).warnings as string[])
          : [];
        set({
          apiKeyConfigured: Boolean(health.apiKeyConfigured),
          runtimeError: health.apiKeyConfigured
            ? warnings.find((w) => !w.includes("离线 fixture")) ?? null
            : null,
          indexStats: {
            chunkCount: Number(health.index?.chunkCount ?? 0),
            embeddingModel:
              (health.embedding?.model as string | undefined) ??
              (health.index?.embeddingModel as string | null) ??
              null,
            remote: Boolean(health.embedding?.remote),
          },
        });
      }
    } catch {
      set({
        apiKeyConfigured: false,
        runtimeError:
          "无法连接后端。请在 aether-desk 目录执行 npm run desk，然后打开 http://localhost:3000",
      });
    }
    await Promise.all([
      get().refreshSessions(),
      get().refreshNotes(),
      get().refreshIndexStats(),
    ]);
    const sessions = get().sessions;
    if (sessions[0]) {
      await get().loadSession(sessions[0].id);
    }
  },

  async refreshSessions() {
    try {
      const res = await fetch("/api/sessions");
      if (!res.ok) return;
      const data = (await res.json()) as { sessions: SessionSummary[] };
      set({ sessions: data.sessions ?? [] });
    } catch {
      /* health 失败时可能连带挂掉，忽略 */
    }
  },

  async refreshNotes() {
    try {
      const res = await fetch("/api/notes");
      if (!res.ok) return;
      const data = (await res.json()) as { notes: NoteRow[] };
      set({ notes: data.notes ?? [] });
    } catch {
      /* ignore */
    }
  },

  async refreshIndexStats() {
    try {
      const res = await fetch("/api/notes/reindex");
      const data = (await res.json()) as {
        stats?: { chunkCount?: number; embeddingModel?: string | null };
        embedding?: { model?: string; remote?: boolean };
      };
      set({
        indexStats: {
          chunkCount: Number(data.stats?.chunkCount ?? 0),
          embeddingModel:
            data.embedding?.model ?? data.stats?.embeddingModel ?? null,
          remote: Boolean(data.embedding?.remote),
        },
      });
    } catch {
      /* ignore */
    }
  },

  async reindexNotes() {
    set({ reindexing: true });
    try {
      const res = await fetch("/api/notes/reindex", { method: "POST" });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(body?.error || `重建索引失败 HTTP ${res.status}`);
      }
      await get().refreshIndexStats();
      set({ error: null });
    } catch (e) {
      set({
        error: e instanceof Error ? e.message : "重建索引失败",
      });
    } finally {
      set({ reindexing: false });
    }
  },

  async loadSession(id: string) {
    get().abortController?.abort();
    const res = await fetch(`/api/sessions/${id}`);
    if (!res.ok) return;
    const data = (await res.json()) as {
      messages: ChatMessage[];
      toolRuns: ToolRun[];
      artifacts: Artifact[];
    };
    set({
      sessionId: id,
      messages:
        data.messages.length > 0
          ? data.messages
          : [
              {
                id: uid("msg"),
                role: "assistant",
                content: "当前会话为空，直接提问即可。",
                createdAt: Date.now(),
              },
            ],
      toolRuns: data.toolRuns,
      artifacts: data.artifacts,
      selectedArtifactId: data.artifacts[0]?.id ?? null,
      streamingText: "",
      error: null,
      phase: "idle",
      abortController: null,
    });
  },

  async newSession() {
    get().abortController?.abort();
    const res = await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "新会话" }),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      set({
        error: body?.error || `创建会话失败 HTTP ${res.status}`,
        abortController: null,
      });
      return;
    }
    const data = (await res.json()) as { session: SessionSummary };
    await get().refreshSessions();
    set({
      sessionId: data.session.id,
      messages: [
        {
          id: uid("msg"),
          role: "assistant",
          content: "新会话已创建。试试检索知识库或让我生成待办。",
          createdAt: Date.now(),
        },
      ],
      toolRuns: [],
      artifacts: [],
      selectedArtifactId: null,
      streamingText: "",
      error: null,
      phase: "idle",
      abortController: null,
    });
  },

  async deleteSession(id: string) {
    const res = await fetch(`/api/sessions/${id}`, { method: "DELETE" });
    if (!res.ok) return;
    const { sessionId } = get();
    await get().refreshSessions();
    if (sessionId === id) {
      const next = get().sessions[0];
      if (next) {
        await get().loadSession(next.id);
      } else {
        await get().newSession();
      }
    }
  },

  async renameSession(id: string, title: string) {
    const trimmed = title.trim();
    if (!trimmed) return;
    const res = await fetch(`/api/sessions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: trimmed }),
    });
    if (!res.ok) return;
    await get().refreshSessions();
  },

  async togglePinSession(id: string) {
    const current = get().sessions.find((s) => s.id === id);
    if (!current) return;
    const res = await fetch(`/api/sessions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pinned: !current.pinned }),
    });
    if (!res.ok) return;
    await get().refreshSessions();
  },

  async exportSession(id: string) {
    const res = await fetch(`/api/sessions/${id}`);
    if (!res.ok) {
      set({ error: `导出失败 HTTP ${res.status}` });
      return;
    }
    const data = await res.json();
    const session = get().sessions.find((s) => s.id === id);
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const safe =
      (session?.title || "session")
        .replace(/[\\/:*?"<>|]/g, "_")
        .slice(0, 40) || "session";
    a.href = url;
    a.download = `aether-${safe}-${id.slice(0, 8)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  },

  async importSession(file: File) {
    try {
      const text = await file.text();
      const payload = JSON.parse(text) as unknown;
      const res = await fetch("/api/sessions/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        set({ error: err?.error || `导入失败 HTTP ${res.status}` });
        return;
      }
      const data = (await res.json()) as { session: SessionSummary };
      await get().refreshSessions();
      if (data.session?.id) {
        await get().loadSession(data.session.id);
      }
      set({ error: null });
    } catch (e) {
      set({
        error: e instanceof Error ? e.message : "导入失败：JSON 无法解析",
      });
    }
  },

  async sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    const { phase } = get();
    if (phase !== "idle" && phase !== "error" && phase !== "awaiting_hitl") {
      return;
    }

    const userMsg: ChatMessage = {
      id: uid("msg"),
      role: "user",
      content: trimmed,
      createdAt: Date.now(),
    };

    const controller = new AbortController();
    set((s) => ({
      messages: [...s.messages, userMsg],
      phase: "thinking",
      streamingText: "",
      error: null,
      abortController: controller,
    }));

    let assistantBuffer = "";

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          sessionId: get().sessionId,
          message: trimmed,
        }),
      });

      if (!res.ok) {
        const err = (await res.json().catch(() => null)) as {
          error?: string;
          hint?: string;
        } | null;
        const detail = [err?.error, err?.hint].filter(Boolean).join(" ");
        throw new Error(detail || `HTTP ${res.status}`);
      }

      if (!res.body) {
        throw new Error("响应缺少 body");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let sawHitl = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parsed = parseSseChunk(buffer);
        buffer = parsed.rest;

        for (const evt of parsed.events) {
          const data = JSON.parse(evt.data) as Record<string, unknown>;
          if (evt.event === "session") {
            const sid = String(data.sessionId);
            set({ sessionId: sid });
          } else if (evt.event === "phase") {
            set({ phase: data.phase as AgentPhase });
          } else if (evt.event === "text-delta") {
            assistantBuffer += String(data.delta ?? "");
            set({ streamingText: assistantBuffer, phase: "streaming" });
          } else if (evt.event === "tool-run") {
            const run = data as unknown as ToolRun;
            if (run.status === "awaiting_approval") sawHitl = true;
            set((s) => ({
              toolRuns: upsertToolRun(s.toolRuns, run),
              phase:
                run.status === "awaiting_approval" ? "awaiting_hitl" : "tooling",
            }));
          } else if (evt.event === "artifact") {
            const artifact = data as unknown as Artifact;
            set((s) => ({
              artifacts: [artifact, ...s.artifacts.filter((a) => a.id !== artifact.id)],
              selectedArtifactId: artifact.id,
            }));
          } else if (evt.event === "error") {
            throw new Error(String(data.message ?? "未知错误"));
          } else if (evt.event === "done") {
            const finalText = String(data.text ?? assistantBuffer);
            if (finalText.trim()) {
              set((s) => ({
                messages: [
                  ...s.messages,
                  {
                    id: uid("msg"),
                    role: "assistant",
                    content: finalText,
                    createdAt: Date.now(),
                  },
                ],
                streamingText: "",
                phase: sawHitl ? "awaiting_hitl" : "idle",
                abortController: null,
              }));
            } else {
              set({
                streamingText: "",
                phase: sawHitl ? "awaiting_hitl" : "idle",
                abortController: null,
              });
            }
            await get().refreshSessions();
            await get().refreshNotes();
          }
        }
      }

      // 连接中断且未收到 done：收尾，避免 phase 卡死
      const { phase: endPhase, streamingText } = get();
      if (
        endPhase === "thinking" ||
        endPhase === "streaming" ||
        endPhase === "tooling"
      ) {
        const sid = get().sessionId;
        set({
          streamingText: "",
          phase: sawHitl ? "awaiting_hitl" : "idle",
          abortController: null,
          error: streamingText
            ? null
            : "连接中断，未收到完整结束事件",
        });
        if (sid) await get().loadSession(sid);
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        const sid = get().sessionId;
        set({
          phase: "idle",
          abortController: null,
          streamingText: "",
        });
        if (sid) await get().loadSession(sid);
        return;
      }
      const message = err instanceof Error ? err.message : "请求失败";
      set({
        error: message,
        phase: "error",
        streamingText: "",
        abortController: null,
      });
    }
  },

  stop() {
    get().abortController?.abort();
    set({ phase: "idle", abortController: null, streamingText: "" });
  },

  selectArtifact(id) {
    set({ selectedArtifactId: id });
  },

  selectCitation(index: number) {
    const arts = get().artifacts;
    const withCite = arts.find(
      (a) =>
        a.kind === "note" &&
        a.payload.citations?.some((c) => c.index === index),
    );
    if (withCite) {
      set({ selectedArtifactId: withCite.id });
    }
  },

  async approveToolRun(toolRunId) {
    const res = await fetch(`/api/tools/${toolRunId}/approve`, {
      method: "POST",
    });
    const body = (await res.json().catch(() => null)) as {
      error?: string;
      note?: { noteId: string } | null;
    } | null;
    if (!res.ok) {
      set({
        error: body?.error || `批准失败 HTTP ${res.status}`,
        phase: "error",
      });
      return;
    }
    set((s) => ({
      toolRuns: patchToolStatus(s.toolRuns, toolRunId, "result", {
        resultPreview: body?.note
          ? `笔记已写入（${body.note.noteId}）`
          : "用户已批准写操作",
      }),
      phase: "idle",
      error: null,
    }));
    if (body?.note) {
      await get().refreshNotes();
      await get().refreshIndexStats();
    }
    const sid = get().sessionId;
    if (sid) await get().loadSession(sid);
  },

  async rejectToolRun(toolRunId) {
    const res = await fetch(`/api/tools/${toolRunId}/reject`, {
      method: "POST",
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      set({
        error: body?.error || `拒绝失败 HTTP ${res.status}`,
        phase: "error",
      });
      return;
    }
    set((s) => ({
      toolRuns: patchToolStatus(s.toolRuns, toolRunId, "cancelled", {
        resultPreview: "用户拒绝写操作",
      }),
      artifacts: s.artifacts.filter((a) => a.sourceToolRunId !== toolRunId),
      phase: "idle",
      error: null,
    }));
  },

  async toggleTaskItem(artifactId, itemId) {
    const art = get().artifacts.find((a) => a.id === artifactId);
    if (!art || art.kind !== "task_card") return;
    const item = art.payload.items.find((i) => i.id === itemId);
    if (!item) return;
    const nextDone = !item.done;

    set((s) => ({
      artifacts: s.artifacts.map((a) => {
        if (a.id !== artifactId || a.kind !== "task_card") return a;
        return {
          ...a,
          payload: {
            items: a.payload.items.map((it) =>
              it.id === itemId ? { ...it, done: nextDone } : it,
            ),
          },
        };
      }),
    }));

    await fetch(`/api/artifacts/${artifactId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId, done: nextDone }),
    });
  },

  async createNote(input) {
    const res = await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(data.error || `保存失败 HTTP ${res.status}`);
    }
    await Promise.all([get().refreshNotes(), get().refreshIndexStats()]);
  },

  async updateNote(input) {
    const res = await fetch("/api/notes", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(data.error || `更新失败 HTTP ${res.status}`);
    }
    await Promise.all([get().refreshNotes(), get().refreshIndexStats()]);
  },

  async deleteNote(id) {
    const res = await fetch(`/api/notes?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(data.error || `删除失败 HTTP ${res.status}`);
    }
    await Promise.all([get().refreshNotes(), get().refreshIndexStats()]);
  },

  setNotesOpen(open) {
    set({ notesOpen: open });
  },

  setSessionsOpen(open) {
    set({ sessionsOpen: open });
  },

  setShellView(view) {
    set({ shellView: view });
  },
}));

/** Collect citation indexes from note artifacts (for UI validation of [n] badges). */
export function collectValidCitationIndexes(artifacts: Artifact[]): Set<number> {
  const indexes = new Set<number>();
  for (const a of artifacts) {
    if (a.kind !== "note") continue;
    for (const c of a.payload.citations ?? []) {
      indexes.add(c.index);
    }
  }
  return indexes;
}
