import { TOOL_CATALOG } from "@/lib/ai/tools/catalog";
import { getDb } from "@/lib/db";
import { artifacts, toolRuns } from "@/lib/db/schema";
import { getEmbeddingInfo } from "@/lib/notes/embed";
import { searchNotes, type RetrievalMode } from "@/lib/notes/search";
import type { Artifact, Citation, ToolName, ToolRun } from "@/lib/types/agent";
import { tool } from "ai";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";

export type DeskStreamEvent =
  | { type: "tool-run"; toolRun: ToolRun }
  | { type: "artifact"; artifact: Artifact };

interface ToolContext {
  sessionId: string;
  emit: (event: DeskStreamEvent) => void;
}

function insertToolRun(input: {
  sessionId: string;
  id: string;
  name: ToolName;
  status: ToolRun["status"];
  args: Record<string, unknown>;
  requiresApproval: boolean;
  resultPreview?: string;
  errorMessage?: string;
  endedAt?: number;
}): ToolRun {
  const db = getDb();
  const meta = TOOL_CATALOG[input.name];
  const startedAt = Date.now();
  const run: ToolRun = {
    id: input.id,
    name: input.name,
    displayName: meta.displayName,
    status: input.status,
    args: input.args,
    resultPreview: input.resultPreview,
    errorMessage: input.errorMessage,
    startedAt,
    endedAt: input.endedAt,
    requiresApproval: input.requiresApproval,
  };

  db.insert(toolRuns)
    .values({
      id: run.id,
      sessionId: input.sessionId,
      name: run.name,
      displayName: run.displayName,
      status: run.status,
      argsJson: JSON.stringify(run.args ?? {}),
      resultPreview: run.resultPreview,
      errorMessage: run.errorMessage,
      requiresApproval: run.requiresApproval ?? false,
      startedAt: run.startedAt,
      endedAt: run.endedAt,
    })
    .run();

  return run;
}

function updateToolRun(
  id: string,
  patch: Partial<
    Pick<
      ToolRun,
      "status" | "resultPreview" | "errorMessage" | "endedAt"
    >
  >,
) {
  const db = getDb();
  db.update(toolRuns)
    .set({
      status: patch.status,
      resultPreview: patch.resultPreview,
      errorMessage: patch.errorMessage,
      endedAt: patch.endedAt ?? Date.now(),
    })
    .where(eq(toolRuns.id, id))
    .run();
}

function insertArtifact(input: {
  sessionId: string;
  artifact: Artifact;
  approvalStatus: "none" | "pending" | "approved" | "rejected";
}) {
  const db = getDb();
  db.insert(artifacts)
    .values({
      id: input.artifact.id,
      sessionId: input.sessionId,
      kind: input.artifact.kind,
      title: input.artifact.title,
      payloadJson: JSON.stringify(input.artifact.payload),
      sourceToolRunId: input.artifact.sourceToolRunId,
      approvalStatus: input.approvalStatus,
      createdAt: input.artifact.createdAt,
    })
    .run();
}

export function createDeskTools(ctx: ToolContext) {
  return {
    search_notes: tool({
      description:
        "在用户个人知识库中混合检索（关键词+向量）。回答事实性问题前应优先调用。返回带引用编号的命中；回答时用 [1][2] 标注来源。",
      inputSchema: z.object({
        query: z.string().min(1).describe("检索关键词或自然语言问题"),
        limit: z.number().int().min(1).max(8).optional(),
        mode: z
          .enum(["hybrid", "keyword", "vector"])
          .optional()
          .describe("默认 hybrid"),
      }),
      execute: async ({ query, limit, mode }) => {
        const runId = nanoid();
        const retrievalMode = (mode ?? "hybrid") as RetrievalMode;
        const args = { query, limit: limit ?? 5, mode: retrievalMode };
        const pending = insertToolRun({
          sessionId: ctx.sessionId,
          id: runId,
          name: "search_notes",
          status: "running",
          args,
          requiresApproval: false,
        });
        ctx.emit({ type: "tool-run", toolRun: pending });

        try {
          const hits = await searchNotes(query, limit ?? 5, retrievalMode);
          const emb = getEmbeddingInfo();
          const preview =
            hits.length === 0
              ? "未命中笔记"
              : `命中 ${hits.length} 条（${retrievalMode} / ${emb.model}）：${hits
                  .map((h) => `[${h.citationIndex}] ${h.title}`)
                  .join("、")}`;

          updateToolRun(runId, {
            status: "result",
            resultPreview: preview,
            endedAt: Date.now(),
          });
          ctx.emit({
            type: "tool-run",
            toolRun: {
              ...pending,
              status: "result",
              resultPreview: preview,
              endedAt: Date.now(),
            },
          });

          const citations: Citation[] = hits.map((h) => ({
            index: h.citationIndex ?? 0,
            noteId: h.noteId,
            title: h.title,
            snippet: h.snippet,
            score: h.score,
            mode: h.mode,
            keywordScore: h.keywordScore,
            vectorScore: h.vectorScore,
          }));

          if (hits.length > 0) {
            const artifact: Artifact = {
              id: nanoid(),
              kind: "note",
              title: `检索：${query.slice(0, 24)}`,
              createdAt: Date.now(),
              sourceToolRunId: runId,
              payload: {
                body: citations
                  .map(
                    (c) =>
                      `[${c.index}] ${c.title} · score=${c.score}` +
                      (c.vectorScore != null ? ` vec=${c.vectorScore}` : "") +
                      (c.keywordScore != null ? ` kw=${c.keywordScore}` : "") +
                      `\n${c.snippet}`,
                  )
                  .join("\n\n"),
                citations,
                retrievalMode,
                embeddingModel: emb.model,
              },
            };
            insertArtifact({
              sessionId: ctx.sessionId,
              artifact,
              approvalStatus: "none",
            });
            ctx.emit({ type: "artifact", artifact });
          }

          return {
            hits: citations,
            preview,
            retrievalMode,
            embeddingModel: emb.model,
            embeddingRemote: emb.remote,
          };
        } catch (err) {
          const message = err instanceof Error ? err.message : "检索失败";
          updateToolRun(runId, {
            status: "error",
            errorMessage: message,
            endedAt: Date.now(),
          });
          ctx.emit({
            type: "tool-run",
            toolRun: {
              ...pending,
              status: "error",
              errorMessage: message,
              endedAt: Date.now(),
            },
          });
          return { hits: [], error: message };
        }
      },
    }),

    create_task_card: tool({
      description:
        "根据讨论生成待办任务卡片。这是写操作：卡片先以「待确认」状态创建，需用户在 UI 批准后才算生效。",
      inputSchema: z.object({
        title: z.string().min(1).describe("清单标题"),
        items: z
          .array(z.string().min(1))
          .min(1)
          .max(12)
          .describe("待办条目文本列表"),
      }),
      execute: async ({ title, items }) => {
        const runId = nanoid();
        const args = { title, items };
        const pending = insertToolRun({
          sessionId: ctx.sessionId,
          id: runId,
          name: "create_task_card",
          status: "awaiting_approval",
          args,
          requiresApproval: true,
          resultPreview: `待确认：${items.length} 条任务`,
          endedAt: Date.now(),
        });
        ctx.emit({ type: "tool-run", toolRun: pending });

        const artifact: Artifact = {
          id: nanoid(),
          kind: "task_card",
          title,
          createdAt: Date.now(),
          sourceToolRunId: runId,
          payload: {
            items: items.map((text) => ({
              id: nanoid(8),
              text,
              done: false,
            })),
          },
        };
        insertArtifact({
          sessionId: ctx.sessionId,
          artifact,
          approvalStatus: "pending",
        });
        ctx.emit({ type: "artifact", artifact });

        return {
          status: "awaiting_approval",
          artifactId: artifact.id,
          toolRunId: runId,
          message: "任务卡已生成，等待用户在制品区/时间线确认。",
        };
      },
    }),

    summarize_diff: tool({
      description: "对比两个方案/文本，生成结构化对比表制品。",
      inputSchema: z.object({
        title: z.string().default("方案对比"),
        leftLabel: z.string(),
        rightLabel: z.string(),
        dimensions: z
          .array(
            z.object({
              name: z.string(),
              left: z.string(),
              right: z.string(),
            }),
          )
          .min(1)
          .max(10),
      }),
      execute: async ({ title, leftLabel, rightLabel, dimensions }) => {
        const runId = nanoid();
        const args = { title, leftLabel, rightLabel, dimensions };
        const pending = insertToolRun({
          sessionId: ctx.sessionId,
          id: runId,
          name: "summarize_diff",
          status: "running",
          args,
          requiresApproval: false,
        });
        ctx.emit({ type: "tool-run", toolRun: pending });

        const artifact: Artifact = {
          id: nanoid(),
          kind: "table_card",
          title,
          createdAt: Date.now(),
          sourceToolRunId: runId,
          payload: {
            columns: ["维度", leftLabel, rightLabel],
            rows: dimensions.map((d) => [d.name, d.left, d.right]),
          },
        };
        insertArtifact({
          sessionId: ctx.sessionId,
          artifact,
          approvalStatus: "none",
        });
        updateToolRun(runId, {
          status: "result",
          resultPreview: `已生成对比表（${dimensions.length} 行）`,
          endedAt: Date.now(),
        });
        ctx.emit({
          type: "tool-run",
          toolRun: {
            ...pending,
            status: "result",
            resultPreview: `已生成对比表（${dimensions.length} 行）`,
            endedAt: Date.now(),
          },
        });
        ctx.emit({ type: "artifact", artifact });

        return { artifactId: artifact.id, rows: dimensions.length };
      },
    }),

    save_note: tool({
      description:
        "将有价值的结论写入个人知识库。这是写操作：先生成待确认草稿，需用户在 UI 批准后才落库并索引。",
      inputSchema: z.object({
        title: z.string().min(1),
        content: z.string().min(1),
        tags: z.string().optional(),
      }),
      execute: async ({ title, content, tags }) => {
        const runId = nanoid();
        const tagStr = tags ?? "";
        const args = { title, content, tags: tagStr };
        const pending = insertToolRun({
          sessionId: ctx.sessionId,
          id: runId,
          name: "save_note",
          status: "awaiting_approval",
          args,
          requiresApproval: true,
          resultPreview: `待确认写入笔记：${title}`,
          endedAt: Date.now(),
        });
        ctx.emit({ type: "tool-run", toolRun: pending });

        const artifact: Artifact = {
          id: nanoid(),
          kind: "note",
          title: `待确认笔记：${title}`,
          createdAt: Date.now(),
          sourceToolRunId: runId,
          payload: {
            body: `${content}\n\n— 等待批准后写入知识库并索引`,
            pendingNote: { title, content, tags: tagStr },
          },
        };
        insertArtifact({
          sessionId: ctx.sessionId,
          artifact,
          approvalStatus: "pending",
        });
        ctx.emit({ type: "artifact", artifact });

        return {
          status: "awaiting_approval",
          artifactId: artifact.id,
          toolRunId: runId,
          message: "笔记草稿已生成，等待用户批准后才会写入知识库。",
        };
      },
    }),

    fetch_url: tool({
      description:
        "抓取公开 HTTP(S) 页面文本摘要（超时 8s）。仅用于公开文档；失败要告诉用户原因。",
      inputSchema: z.object({
        url: z.string().url(),
      }),
      execute: async ({ url }) => {
        const runId = nanoid();
        const args = { url };
        const pending = insertToolRun({
          sessionId: ctx.sessionId,
          id: runId,
          name: "fetch_url",
          status: "running",
          args,
          requiresApproval: false,
        });
        ctx.emit({ type: "tool-run", toolRun: pending });

        try {
          assertPublicHttpUrl(url);
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 8000);
          const res = await fetch(url, {
            signal: controller.signal,
            headers: { "User-Agent": "AetherDesk/1.0 (+local-agent)" },
            redirect: "manual",
          });
          clearTimeout(timer);
          if (res.status >= 300 && res.status < 400) {
            throw new Error("禁止跟随重定向（防 SSRF）");
          }
          if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
          }
          const raw = await res.text();
          const text = raw
            .replace(/<script[\s\S]*?<\/script>/gi, " ")
            .replace(/<style[\s\S]*?<\/style>/gi, " ")
            .replace(/<[^>]+>/g, " ")
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 4000);

          const preview = `抓取成功，摘录 ${Math.min(text.length, 120)} 字`;
          updateToolRun(runId, {
            status: "result",
            resultPreview: preview,
            endedAt: Date.now(),
          });
          ctx.emit({
            type: "tool-run",
            toolRun: {
              ...pending,
              status: "result",
              resultPreview: preview,
              endedAt: Date.now(),
            },
          });

          const artifact: Artifact = {
            id: nanoid(),
            kind: "note",
            title: `抓取：${url}`,
            createdAt: Date.now(),
            sourceToolRunId: runId,
            payload: { body: text.slice(0, 2000) },
          };
          insertArtifact({
            sessionId: ctx.sessionId,
            artifact,
            approvalStatus: "none",
          });
          ctx.emit({ type: "artifact", artifact });

          return { url, excerpt: text.slice(0, 2000), length: text.length };
        } catch (err) {
          const message = err instanceof Error ? err.message : "抓取失败";
          updateToolRun(runId, {
            status: "error",
            errorMessage: message,
            endedAt: Date.now(),
          });
          ctx.emit({
            type: "tool-run",
            toolRun: {
              ...pending,
              status: "error",
              errorMessage: message,
              endedAt: Date.now(),
            },
          });
          return { url, error: message };
        }
      },
    }),
  };
}

export const SYSTEM_PROMPT = `你是 Aether Desk 的工作台 Agent：帮助用户管理个人知识库、沉淀结论、生成可确认的任务。

行为约束：
1. 涉及用户笔记/已有知识时，先调用 search_notes（默认 hybrid），再回答。
2. 回答时用引用编号标注来源，例如「……[1]……[2]」，编号必须对应检索返回的 citation index。
3. 需要落地待办时调用 create_task_card；告诉用户需在界面确认后生效。
4. 对比方案时用 summarize_diff 产出表格制品；若必须在对话里列表格，使用标准 Markdown 表格语法。
5. 重要可复用结论用 save_note：会生成待确认草稿，需用户批准后才写入知识库。
6. 需要公开网页信息时用 fetch_url；仅限公网 http(s)，失败则如实说明。
7. 不要假装已经执行了未调用的工具。保持简洁、可执行。
8. 长内容优先摘要 + 引用；待办/大表格放制品区，避免一条消息过长。
9. 若上下文含「系统回灌」的工具结果摘要，追问时优先依据该事实，勿编造未出现的检索/工具结论。`;

/** 禁止内网 / 非 http(s)，降低 SSRF 风险（本地 Agent 演示级防护） */
function assertPublicHttpUrl(raw: string) {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error("URL 无效");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("仅允许 http/https");
  }
  const host = parsed.hostname.toLowerCase();
  if (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "0.0.0.0" ||
    host === "::1" ||
    host.endsWith(".local") ||
    host.endsWith(".internal")
  ) {
    throw new Error("禁止访问本机或内网主机名");
  }
  // IPv4 私网 / 链路本地
  const m = host.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (m) {
    const a = Number(m[1]);
    const b = Number(m[2]);
    if (
      a === 10 ||
      a === 127 ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 169 && b === 254)
    ) {
      throw new Error("禁止访问私有 IP 段");
    }
  }
}
