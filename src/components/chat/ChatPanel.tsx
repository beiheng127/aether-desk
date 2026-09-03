"use client";

import { MessageMarkdown } from "@/components/chat/MessageMarkdown";
import { Button } from "@/components/ui/button";
import { DEMO_SCRIPTS } from "@/lib/demo/scripts";
import {
  collectValidCitationIndexes,
  useDeskStore,
} from "@/lib/stores/desk-store";
import { cn } from "@/lib/utils";
import { ArrowUp, Square } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const ASSISTANT_BUBBLE =
  "mr-auto max-w-[92%] rounded-2xl rounded-bl-md border border-zinc-200/90 bg-white text-zinc-800 shadow-[0_1px_0_rgba(24,24,27,0.04)]";
const ASSISTANT_SCROLL =
  "max-h-[min(52vh,28rem)] overflow-y-auto overscroll-contain [scrollbar-width:thin]";

export function ChatPanel() {
  const messages = useDeskStore((s) => s.messages);
  const artifacts = useDeskStore((s) => s.artifacts);
  const streamingText = useDeskStore((s) => s.streamingText);
  const phase = useDeskStore((s) => s.phase);
  const error = useDeskStore((s) => s.error);
  const sendMessage = useDeskStore((s) => s.sendMessage);
  const stop = useDeskStore((s) => s.stop);
  const selectCitation = useDeskStore((s) => s.selectCitation);
  const setNotesOpen = useDeskStore((s) => s.setNotesOpen);
  const apiKeyConfigured = useDeskStore((s) => s.apiKeyConfigured);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const validCitationIndexes = collectValidCitationIndexes(artifacts);
  const citationIndexProp =
    validCitationIndexes.size > 0 ? validCitationIndexes : undefined;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText, phase]);

  const busy =
    phase === "thinking" || phase === "tooling" || phase === "streaming";
  const showGuide = messages.length <= 1 && !streamingText && !busy;

  const onSubmit = async () => {
    const text = input;
    setInput("");
    await sendMessage(text);
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {showGuide ? (
          <div className="mb-2 rounded-xl border border-teal-200/70 bg-gradient-to-br from-teal-50/90 to-white p-4">
            <p className="text-sm font-semibold text-teal-950">怎么用这张工作台</p>
            <ol className="mt-2 space-y-1.5 text-xs leading-relaxed text-teal-900/80">
              <li>1. 点右上角「知识库」补充或编辑笔记（已有种子可直接搜）</li>
              <li>2. 下方快捷句一键填入；「演示剧本」覆盖检索→表格→待办→存笔记</li>
              <li>3. 中间栏看工具；写待办 / 存笔记需点「批准」才生效（HITL）</li>
            </ol>
            <button
              type="button"
              onClick={() => setNotesOpen(true)}
              className="mt-3 text-xs font-medium text-teal-800 underline-offset-2 hover:underline"
            >
              打开知识库
            </button>
          </div>
        ) : null}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              "max-w-[92%] text-sm leading-relaxed",
              msg.role === "user"
                ? "ml-auto rounded-2xl rounded-br-md bg-teal-800 px-3.5 py-2.5 text-white shadow-sm shadow-teal-900/10"
                : cn(ASSISTANT_BUBBLE, ASSISTANT_SCROLL, "px-3.5 py-2.5"),
            )}
          >
            {msg.role === "assistant" ? (
              <MessageMarkdown
                text={msg.content}
                onCite={selectCitation}
                validCitationIndexes={citationIndexProp}
              />
            ) : (
              <p className="whitespace-pre-wrap">{msg.content}</p>
            )}
          </div>
        ))}

        {streamingText ? (
          <div
            className={cn(
              ASSISTANT_BUBBLE,
              ASSISTANT_SCROLL,
              "border-teal-200 bg-teal-50/40 px-3.5 py-2.5",
            )}
          >
            <MessageMarkdown
              text={streamingText}
              onCite={selectCitation}
              validCitationIndexes={citationIndexProp}
            />
            <span className="ml-0.5 inline-block h-3.5 w-1 animate-pulse bg-teal-700 align-middle" />
          </div>
        ) : null}

        {phase === "thinking" || phase === "tooling" ? (
          <p className="text-xs text-zinc-500">
            {phase === "thinking" ? "规划中…" : "工具执行中…看中间「工具时间线」"}
          </p>
        ) : null}

        {error ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <div ref={bottomRef} />
      </div>

      <div className="shrink-0 border-t border-zinc-200 bg-white/90 p-3 backdrop-blur">
        <div className="mb-2 flex flex-wrap gap-1.5">
          {DEMO_SCRIPTS.map((q) => (
            <button
              key={q.id}
              type="button"
              title={q.hint ?? q.prompt}
              className={cn(
                "rounded-md border px-2.5 py-1 text-[11px] transition-colors active:scale-[0.98]",
                q.id === "full-demo"
                  ? "border-teal-300 bg-teal-50 text-teal-900 hover:border-teal-400 hover:bg-teal-100"
                  : "border-zinc-200 bg-zinc-50/80 text-zinc-600 hover:border-teal-300 hover:bg-teal-50 hover:text-teal-900",
              )}
              onClick={() => setInput(q.prompt)}
            >
              {q.label}
            </button>
          ))}
        </div>
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void onSubmit();
              }
            }}
            rows={2}
            placeholder={
              apiKeyConfigured === false
                ? "离线 fixture 模式：点快捷句或直接提问…"
                : "提问或下指令… Enter 发送，Shift+Enter 换行"
            }
            className="min-h-[68px] flex-1 resize-none rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm outline-none ring-teal-700/25 placeholder:text-zinc-400 focus:border-teal-600/40 focus:ring-2"
            disabled={busy}
          />
          <div className="flex w-[72px] flex-col gap-2">
            {busy ? (
              <Button variant="danger" size="sm" onClick={stop} className="h-10">
                <Square className="h-3 w-3 fill-current" />
                停止
              </Button>
            ) : (
              <Button
                variant="primary"
                size="sm"
                disabled={!input.trim()}
                onClick={() => void onSubmit()}
                className="h-10"
              >
                <ArrowUp className="h-3.5 w-3.5" strokeWidth={2} />
                发送
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
