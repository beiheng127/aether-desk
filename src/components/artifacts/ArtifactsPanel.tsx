"use client";

import { Badge } from "@/components/ui/badge";
import type { Artifact, Citation } from "@/lib/types/agent";
import { useDeskStore } from "@/lib/stores/desk-store";
import { cn } from "@/lib/utils";

function kindLabel(kind: Artifact["kind"]) {
  switch (kind) {
    case "task_card":
      return "待办卡";
    case "table_card":
      return "表格卡";
    case "note":
      return "笔记/引用";
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

export function ArtifactsPanel() {
  const artifacts = useDeskStore((s) => s.artifacts);
  const selectedArtifactId = useDeskStore((s) => s.selectedArtifactId);
  const selectArtifact = useDeskStore((s) => s.selectArtifact);
  const toggleTaskItem = useDeskStore((s) => s.toggleTaskItem);

  const selected =
    artifacts.find((a) => a.id === selectedArtifactId) ?? artifacts[0] ?? null;

  if (artifacts.length === 0) {
    return (
      <div className="flex h-full flex-col justify-center gap-3 px-5 text-sm text-zinc-500">
        <p className="text-sm font-medium text-zinc-800">制品区待生成</p>
        <p className="text-xs leading-relaxed">
          检索命中会变成可点的引用卡；对比表、待办卡也会落在这里。对话里的{" "}
          <span className="font-mono text-teal-800">[1]</span>{" "}
          可跳转到对应片段。
        </p>
        <p className="text-[11px] text-zinc-400">
          试试：「用混合检索查 Agent Loop，并引用编号回答要点」
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex gap-1.5 overflow-x-auto border-b border-zinc-200 px-3 py-2">
        {artifacts.map((art) => (
          <button
            key={art.id}
            type="button"
            onClick={() => selectArtifact(art.id)}
            className={cn(
              "shrink-0 rounded-md border px-2 py-1 text-left text-xs transition-colors",
              selected?.id === art.id
                ? "border-teal-600 bg-teal-50 text-teal-900"
                : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300",
            )}
          >
            <div className="max-w-[140px] truncate font-medium">{art.title}</div>
            <div className="text-[10px] opacity-70">{kindLabel(art.kind)}</div>
          </button>
        ))}
      </div>

      {selected ? (
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 [scrollbar-width:thin]">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-zinc-900">{selected.title}</h3>
            <Badge tone="teal">{kindLabel(selected.kind)}</Badge>
            {selected.kind === "note" && selected.payload.retrievalMode ? (
              <Badge tone="sky">{selected.payload.retrievalMode}</Badge>
            ) : null}
            {selected.kind === "note" && selected.payload.embeddingModel ? (
              <Badge tone="neutral">{selected.payload.embeddingModel}</Badge>
            ) : null}
            {selected.kind === "note" && selected.payload.pendingNote ? (
              <Badge tone="amber">待写入知识库</Badge>
            ) : null}
          </div>
          <ArtifactBody
            artifact={selected}
            onToggleTask={(itemId) => void toggleTaskItem(selected.id, itemId)}
          />
        </div>
      ) : null}
    </div>
  );
}

function CitationList({ citations }: { citations: Citation[] }) {
  return (
    <ol className="space-y-2">
      {citations.map((c) => (
        <li
          key={`${c.noteId}-${c.index}`}
          className="rounded-lg border border-zinc-200 bg-white p-3"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded bg-teal-700 px-1 text-[11px] font-semibold text-white">
              {c.index}
            </span>
            <span className="text-sm font-medium text-zinc-900">{c.title}</span>
            <Badge tone="neutral">{c.mode}</Badge>
            <span className="text-[11px] text-zinc-400">score {c.score}</span>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-zinc-600">{c.snippet}</p>
          <div className="mt-2 flex gap-3 text-[10px] text-zinc-400">
            {c.keywordScore != null ? <span>kw {c.keywordScore}</span> : null}
            {c.vectorScore != null ? <span>vec {c.vectorScore}</span> : null}
          </div>
        </li>
      ))}
    </ol>
  );
}

function ArtifactBody({
  artifact,
  onToggleTask,
}: {
  artifact: Artifact;
  onToggleTask: (itemId: string) => void;
}) {
  switch (artifact.kind) {
    case "note":
      if (artifact.payload.citations?.length) {
        return <CitationList citations={artifact.payload.citations} />;
      }
      return (
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-700">
          {artifact.payload.body}
        </p>
      );
    case "table_card":
      return (
        <div className="overflow-x-auto rounded-md border border-zinc-200">
          <table className="w-full border-collapse text-left text-xs">
            <thead className="bg-zinc-50 text-zinc-600">
              <tr>
                {artifact.payload.columns.map((col) => (
                  <th
                    key={col}
                    className="border-b border-zinc-200 px-3 py-2 font-medium"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {artifact.payload.rows.map((row, i) => (
                <tr key={i} className="odd:bg-white even:bg-zinc-50/60">
                  {row.map((cell, j) => (
                    <td
                      key={j}
                      className="border-b border-zinc-100 px-3 py-2 text-zinc-800"
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case "task_card":
      return (
        <ul className="space-y-2">
          {artifact.payload.items.map((item) => (
            <li key={item.id}>
              <label className="flex cursor-pointer items-start gap-2 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm hover:border-teal-300">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={item.done}
                  onChange={() => onToggleTask(item.id)}
                />
                <span
                  className={cn(
                    "leading-relaxed text-zinc-800",
                    item.done && "text-zinc-400 line-through",
                  )}
                >
                  {item.text}
                </span>
              </label>
            </li>
          ))}
        </ul>
      );
    default: {
      const _exhaustive: never = artifact;
      return _exhaustive;
    }
  }
}
