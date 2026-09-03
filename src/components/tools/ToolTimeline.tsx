"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ToolRun, ToolRunStatus } from "@/lib/types/agent";
import { useDeskStore } from "@/lib/stores/desk-store";

function statusTone(status: ToolRunStatus): Parameters<typeof Badge>[0]["tone"] {
  switch (status) {
    case "pending":
      return "neutral";
    case "running":
      return "sky";
    case "awaiting_approval":
      return "amber";
    case "result":
      return "teal";
    case "error":
      return "rose";
    case "cancelled":
      return "neutral";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

function statusLabel(status: ToolRunStatus): string {
  switch (status) {
    case "pending":
      return "排队";
    case "running":
      return "执行中";
    case "awaiting_approval":
      return "待确认";
    case "result":
      return "完成";
    case "error":
      return "失败";
    case "cancelled":
      return "已取消";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

function durationMs(run: ToolRun) {
  const end = run.endedAt ?? Date.now();
  return Math.max(0, end - run.startedAt);
}

export function ToolTimeline() {
  const toolRuns = useDeskStore((s) => s.toolRuns);
  const approveToolRun = useDeskStore((s) => s.approveToolRun);
  const rejectToolRun = useDeskStore((s) => s.rejectToolRun);

  if (toolRuns.length === 0) {
    return (
      <div className="flex h-full flex-col justify-center gap-3 px-5 text-sm text-zinc-500">
        <p className="text-sm font-medium text-zinc-800">工具时间线为空</p>
        <p className="text-xs leading-relaxed">
          Agent 调用工具时，这里会实时显示参数、状态与耗时。写操作（如创建待办）会出现「待确认」，需你批准后才落库。
        </p>
        <p className="text-[11px] text-zinc-400">
          试试：「根据 Agent Loop 笔记生成 3 条学习待办」
        </p>
      </div>
    );
  }

  const maxDur = Math.max(...toolRuns.map(durationMs), 1);
  const totalDur = toolRuns.reduce((n, r) => n + durationMs(r), 0);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b border-zinc-200/80 bg-white/70 px-4 py-3">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-[11px] font-medium text-zinc-500">
            耗时概览
          </span>
          <span className="font-mono text-[11px] text-zinc-400">
            Σ {totalDur} ms · {toolRuns.length} tools
          </span>
        </div>
        <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-zinc-100">
          {[...toolRuns]
            .sort((a, b) => a.startedAt - b.startedAt)
            .map((run) => {
              const d = durationMs(run);
              const pct = Math.max(4, (d / maxDur) * 100);
              const tone =
                run.status === "error"
                  ? "bg-rose-400"
                  : run.status === "awaiting_approval"
                    ? "bg-amber-400"
                    : "bg-teal-600/70";
              return (
                <div
                  key={run.id}
                  title={`${run.displayName} · ${d} ms`}
                  className={`${tone} h-full`}
                  style={{ width: `${pct / toolRuns.length}%`, minWidth: 4 }}
                />
              );
            })}
        </div>
      </div>

      <ol className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4 [scrollbar-width:thin]">
        {[...toolRuns].reverse().map((run, index) => {
          const d = durationMs(run);
          const barPct = Math.round((d / maxDur) * 100);
          return (
            <li
              key={run.id}
              className="rounded-lg border border-zinc-200 bg-zinc-50/80 p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-zinc-400">
                      #{toolRuns.length - index}
                    </span>
                    <h3 className="truncate text-sm font-semibold text-zinc-900">
                      {run.displayName}
                    </h3>
                  </div>
                  <p className="mt-1 font-mono text-[11px] text-zinc-500">
                    {run.name}
                  </p>
                </div>
                <Badge tone={statusTone(run.status)}>
                  {statusLabel(run.status)}
                </Badge>
              </div>

              <div className="mt-2 h-1 overflow-hidden rounded-full bg-zinc-200/80">
                <div
                  className="h-full rounded-full bg-teal-700/50"
                  style={{ width: `${barPct}%` }}
                />
              </div>

              {run.args ? (
                <pre className="mt-2 max-h-28 overflow-auto rounded bg-white p-2 text-[11px] text-zinc-600 ring-1 ring-zinc-200 [scrollbar-width:thin]">
                  {JSON.stringify(run.args, null, 2)}
                </pre>
              ) : null}

              {run.resultPreview ? (
                <p className="mt-2 max-h-24 overflow-y-auto text-xs leading-relaxed text-zinc-700 [scrollbar-width:thin]">
                  {run.resultPreview}
                </p>
              ) : null}

              {run.errorMessage ? (
                <p className="mt-2 text-xs text-rose-600">{run.errorMessage}</p>
              ) : null}

              <div className="mt-2 flex items-center justify-between gap-2">
                <span className="text-[11px] text-zinc-400">
                  {d} ms
                  {run.requiresApproval ? " · 写操作" : ""}
                </span>
                {run.status === "awaiting_approval" ? (
                  <div className="flex gap-1.5">
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => void approveToolRun(run.id)}
                    >
                      批准
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => void rejectToolRun(run.id)}
                    >
                      拒绝
                    </Button>
                  </div>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
