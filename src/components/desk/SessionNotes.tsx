"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useDeskStore, type SessionSummary } from "@/lib/stores/desk-store";
import { cn } from "@/lib/utils";
import { Pencil, Pin, PinOff, Download, Upload, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

function SessionList({ onPick }: { onPick?: () => void }) {
  const sessions = useDeskStore((s) => s.sessions);
  const sessionId = useDeskStore((s) => s.sessionId);
  const loadSession = useDeskStore((s) => s.loadSession);
  const newSession = useDeskStore((s) => s.newSession);
  const deleteSession = useDeskStore((s) => s.deleteSession);
  const renameSession = useDeskStore((s) => s.renameSession);
  const togglePinSession = useDeskStore((s) => s.togglePinSession);
  const exportSession = useDeskStore((s) => s.exportSession);
  const importSession = useDeskStore((s) => s.importSession);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");

  const startRename = (s: SessionSummary) => {
    setEditingId(s.id);
    setDraftTitle(s.title);
  };

  const commitRename = async () => {
    if (!editingId) return;
    const title = draftTitle.trim();
    if (title) {
      await renameSession(editingId, title);
    }
    setEditingId(null);
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center justify-between border-b border-zinc-200 px-3 py-2.5">
        <span className="text-xs font-semibold tracking-wide text-zinc-700">
          会话
        </span>
        <div className="flex items-center gap-0.5">
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              void importSession(file).then(() => onPick?.());
            }}
          />
          <Button
            size="sm"
            variant="ghost"
            title="导入导出的 JSON"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-3.5 w-3.5" strokeWidth={1.75} />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              void newSession().then(() => onPick?.());
            }}
          >
            新建
          </Button>
        </div>
      </div>
      <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2 [scrollbar-width:thin]">
        {sessions.length === 0 ? (
          <li className="px-2 py-6 text-center text-xs leading-relaxed text-zinc-500">
            暂无历史。发一条消息后会出现在这里，刷新也可回放。
          </li>
        ) : (
          sessions.map((s) => {
            const active = sessionId === s.id;
            const editing = editingId === s.id;
            return (
              <li
                key={s.id}
                className={cn(
                  "group rounded-lg border px-2 py-2 transition-colors",
                  active
                    ? "border-teal-200 bg-teal-50 text-teal-950"
                    : "border-transparent text-zinc-700 hover:bg-white",
                  s.pinned && !active ? "bg-white/80" : "",
                )}
              >
                {editing ? (
                  <form
                    className="flex flex-col gap-1.5"
                    onSubmit={(e) => {
                      e.preventDefault();
                      void commitRename();
                    }}
                  >
                    <input
                      autoFocus
                      value={draftTitle}
                      onChange={(e) => setDraftTitle(e.target.value)}
                      onBlur={() => void commitRename()}
                      onKeyDown={(e) => {
                        if (e.key === "Escape") {
                          setEditingId(null);
                        }
                      }}
                      className="w-full rounded border border-teal-300 bg-white px-2 py-1 text-xs outline-none ring-teal-700/20 focus:ring-2"
                      maxLength={80}
                    />
                    <span className="text-[10px] text-zinc-400">
                      Enter 保存 · Esc 取消
                    </span>
                  </form>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        void loadSession(s.id).then(() => onPick?.());
                      }}
                      className="w-full text-left text-xs"
                    >
                      <div className="flex items-start gap-1">
                        {s.pinned ? (
                          <Pin
                            className="mt-0.5 h-3 w-3 shrink-0 text-teal-700"
                            strokeWidth={2}
                          />
                        ) : null}
                        <span className="line-clamp-2 font-medium leading-snug">
                          {s.title}
                        </span>
                      </div>
                      <div className="mt-1 font-mono text-[10px] text-zinc-400">
                        {new Date(s.updatedAt).toLocaleString()}
                      </div>
                    </button>
                    <div className="mt-1.5 flex items-center gap-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
                      <button
                        type="button"
                        title={s.pinned ? "取消置顶" : "置顶"}
                        className="rounded p-1 text-zinc-400 hover:bg-teal-100 hover:text-teal-800"
                        onClick={(e) => {
                          e.stopPropagation();
                          void togglePinSession(s.id);
                        }}
                      >
                        {s.pinned ? (
                          <PinOff className="h-3 w-3" strokeWidth={1.75} />
                        ) : (
                          <Pin className="h-3 w-3" strokeWidth={1.75} />
                        )}
                      </button>
                      <button
                        type="button"
                        title="导出 JSON"
                        className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-800"
                        onClick={(e) => {
                          e.stopPropagation();
                          void exportSession(s.id);
                        }}
                      >
                        <Download className="h-3 w-3" strokeWidth={1.75} />
                      </button>
                      <button
                        type="button"
                        title="重命名"
                        className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-800"
                        onClick={(e) => {
                          e.stopPropagation();
                          startRename(s);
                        }}
                      >
                        <Pencil className="h-3 w-3" strokeWidth={1.75} />
                      </button>
                      <button
                        type="button"
                        title="删除会话"
                        className="rounded p-1 text-zinc-400 hover:bg-rose-50 hover:text-rose-600"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm("删除该会话及其消息？")) {
                            void deleteSession(s.id);
                          }
                        }}
                      >
                        <Trash2 className="h-3 w-3" strokeWidth={1.75} />
                      </button>
                    </div>
                  </>
                )}
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}

export function SessionSidebar() {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden border-r border-zinc-200 bg-zinc-50">
      <SessionList />
    </div>
  );
}

export function SessionsDrawer() {
  const open = useDeskStore((s) => s.sessionsOpen);
  const setSessionsOpen = useDeskStore((s) => s.setSessionsOpen);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex bg-black/20 lg:hidden">
      <aside className="flex h-full w-[80%] max-w-xs flex-col overflow-hidden bg-zinc-50 shadow-xl">
        <SessionList onPick={() => setSessionsOpen(false)} />
      </aside>
      <button
        type="button"
        className="flex-1"
        aria-label="关闭会话列表"
        onClick={() => setSessionsOpen(false)}
      />
    </div>
  );
}

export function NotesDrawer() {
  const open = useDeskStore((s) => s.notesOpen);
  const setNotesOpen = useDeskStore((s) => s.setNotesOpen);
  const notes = useDeskStore((s) => s.notes);
  const createNote = useDeskStore((s) => s.createNote);
  const updateNote = useDeskStore((s) => s.updateNote);
  const deleteNote = useDeskStore((s) => s.deleteNote);
  const indexStats = useDeskStore((s) => s.indexStats);
  const reindexing = useDeskStore((s) => s.reindexing);
  const reindexNotes = useDeskStore((s) => s.reindexNotes);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const resetForm = () => {
    setEditingId(null);
    setTitle("");
    setContent("");
    setTags("");
    setFormError(null);
  };

  const startEdit = (n: (typeof notes)[number]) => {
    setEditingId(n.id);
    setTitle(n.title);
    setContent(n.content);
    setTags(n.tags ?? "");
    setFormError(null);
  };

  const save = async () => {
    if (!title.trim() || !content.trim()) return;
    setSaving(true);
    setFormError(null);
    try {
      if (editingId) {
        await updateNote({
          id: editingId,
          title: title.trim(),
          content,
          tags: tags.trim() || undefined,
        });
      } else {
        await createNote({
          title: title.trim(),
          content,
          tags: tags.trim() || undefined,
        });
      }
      resetForm();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/20">
      <button
        type="button"
        className="flex-1 cursor-default"
        aria-label="关闭"
        onClick={() => setNotesOpen(false)}
      />
      <aside className="flex h-full w-full max-w-md flex-col overflow-hidden border-l border-zinc-200 bg-white shadow-xl">
        <div className="flex shrink-0 items-center justify-between border-b border-zinc-200 px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold">知识库笔记</h2>
            <p className="text-xs text-zinc-500">
              混合检索 · chunks {indexStats?.chunkCount ?? 0} ·{" "}
              {indexStats?.embeddingModel ?? "未索引"}
              {indexStats?.remote === false ? "（本地 embedding）" : ""}
            </p>
          </div>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="secondary"
              disabled={reindexing}
              onClick={() => void reindexNotes()}
            >
              {reindexing ? "索引中…" : "重建索引"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setNotesOpen(false)}>
              关闭
            </Button>
          </div>
        </div>

        <div className="shrink-0 space-y-2 border-b border-zinc-200 p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-zinc-600">
              {editingId ? "编辑笔记" : "新建笔记"}
            </span>
            {editingId ? (
              <button
                type="button"
                className="text-[11px] text-zinc-500 underline-offset-2 hover:underline"
                onClick={resetForm}
              >
                取消编辑
              </button>
            ) : null}
          </div>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="标题"
            className="w-full rounded-md border border-zinc-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-700/30"
          />
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={
              editingId
                ? "修改正文后保存会自动重建该笔记索引"
                : "正文（保存后自动分块 + 向量化）"
            }
            rows={5}
            className="w-full rounded-md border border-zinc-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-700/30"
          />
          <input
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="标签（逗号分隔）"
            className="w-full rounded-md border border-zinc-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-700/30"
          />
          <Button
            variant="primary"
            size="sm"
            disabled={!title.trim() || !content.trim() || saving}
            onClick={() => void save()}
          >
            {saving
              ? "保存中…"
              : editingId
                ? "保存修改并重建索引"
                : "保存并索引"}
          </Button>
          {formError ? (
            <p className="text-xs text-rose-600">{formError}</p>
          ) : null}
        </div>

        <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto p-4 [scrollbar-width:thin]">
          {notes.map((n) => (
            <li
              key={n.id}
              className={cn(
                "rounded-lg border p-3",
                editingId === n.id
                  ? "border-teal-300 bg-teal-50/50"
                  : "border-zinc-200",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-zinc-900">{n.title}</h3>
                  {n.tags ? (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {n.tags.split(",").map((t) =>
                        t.trim() ? (
                          <Badge key={t} tone="neutral">
                            {t.trim()}
                          </Badge>
                        ) : null,
                      )}
                    </div>
                  ) : null}
                </div>
                <div className="flex shrink-0 gap-0.5">
                  <Button size="sm" variant="ghost" onClick={() => startEdit(n)}>
                    编辑
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      if (editingId === n.id) resetForm();
                      void deleteNote(n.id).catch((e) =>
                        setFormError(
                          e instanceof Error ? e.message : "删除失败",
                        ),
                      );
                    }}
                  >
                    删除
                  </Button>
                </div>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-zinc-600">
                {n.content.slice(0, 280)}
                {n.content.length > 280 ? "…" : ""}
              </p>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}

export function Bootstrapper() {
  const bootstrap = useDeskStore((s) => s.bootstrap);
  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);
  return null;
}
