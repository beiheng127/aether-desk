"use client";

import { useEffect, useState } from "react";
import { ArtifactsPanel } from "@/components/artifacts/ArtifactsPanel";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { DeskHome } from "@/components/desk/DeskHome";
import { DeskSettings } from "@/components/desk/DeskSettings";
import { Panel } from "@/components/desk/Panel";
import {
  Bootstrapper,
  NotesDrawer,
  SessionSidebar,
  SessionsDrawer,
} from "@/components/desk/SessionNotes";
import { ToolTimeline } from "@/components/tools/ToolTimeline";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  applyDeskPrefsToDocument,
  loadDeskPrefs,
  type DeskPrefs,
} from "@/lib/desk-prefs";
import { useDeskStore } from "@/lib/stores/desk-store";
import type { AgentPhase } from "@/lib/types/agent";
import {
  BookOpen,
  MessageSquarePlus,
  Settings2,
  Sparkles,
} from "lucide-react";

function phaseLabel(phase: AgentPhase) {
  switch (phase) {
    case "idle":
      return "空闲";
    case "thinking":
      return "规划";
    case "tooling":
      return "工具执行";
    case "streaming":
      return "流式输出";
    case "awaiting_hitl":
      return "等待确认";
    case "error":
      return "错误";
    default: {
      const _exhaustive: never = phase;
      return _exhaustive;
    }
  }
}

function phaseTone(phase: AgentPhase): "neutral" | "teal" | "amber" | "rose" {
  switch (phase) {
    case "idle":
      return "teal";
    case "error":
      return "rose";
    case "awaiting_hitl":
      return "amber";
    case "thinking":
    case "tooling":
    case "streaming":
      return "amber";
    default: {
      const _exhaustive: never = phase;
      return _exhaustive;
    }
  }
}

export function DeskShell() {
  const phase = useDeskStore((s) => s.phase);
  const toolCount = useDeskStore((s) => s.toolRuns.length);
  const artifactCount = useDeskStore((s) => s.artifacts.length);
  const noteCount = useDeskStore((s) => s.notes.length);
  const apiKeyConfigured = useDeskStore((s) => s.apiKeyConfigured);
  const runtimeError = useDeskStore((s) => s.runtimeError);
  const indexStats = useDeskStore((s) => s.indexStats);
  const setNotesOpen = useDeskStore((s) => s.setNotesOpen);
  const setSessionsOpen = useDeskStore((s) => s.setSessionsOpen);
  const shellView = useDeskStore((s) => s.shellView);
  const setShellView = useDeskStore((s) => s.setShellView);
  const newSession = useDeskStore((s) => s.newSession);
  const busy = phase !== "idle" && phase !== "error" && phase !== "awaiting_hitl";
  const [prefs, setPrefs] = useState<DeskPrefs>(() => loadDeskPrefs());

  useEffect(() => {
    const initial = loadDeskPrefs();
    setPrefs(initial);
    applyDeskPrefsToDocument(initial);
    if (!initial.startOnHome) {
      setShellView("chat");
    }
    const onPrefs = () => {
      const next = loadDeskPrefs();
      setPrefs(next);
      applyDeskPrefsToDocument(next);
    };
    window.addEventListener("aether-desk-prefs", onPrefs);
    return () => window.removeEventListener("aether-desk-prefs", onPrefs);
  }, [setShellView]);

  const tabs = [
    ["home", "主页"],
    ["chat", "对话"],
    ["settings", "设置"],
  ] as const;

  return (
    <div
      className={`flex h-dvh max-h-dvh flex-col overflow-hidden bg-[var(--desk-glow)] text-zinc-900 ${
        prefs.compact ? "desk-compact" : ""
      }`}
    >
      <Bootstrapper />
      <NotesDrawer />
      <SessionsDrawer />

      <header className="relative shrink-0 border-b border-zinc-200/80 bg-white/85 px-4 py-3 backdrop-blur-md">
        {busy ? (
          <div className="desk-busy-bar absolute inset-x-0 bottom-0 h-0.5" />
        ) : null}
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-teal-700 text-white shadow-sm shadow-teal-900/10">
                  <Sparkles className="h-3.5 w-3.5" strokeWidth={1.75} />
                </span>
                <h1 className="text-[15px] font-semibold tracking-tight">
                  Aether Desk
                </h1>
              </div>
              <nav
                className="flex items-center gap-0.5 rounded-lg border border-zinc-200/90 bg-zinc-50/90 p-0.5"
                aria-label="主视图"
              >
                {tabs.map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    aria-selected={shellView === id}
                    className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                      shellView === id
                        ? "bg-white text-zinc-900 shadow-sm"
                        : "text-zinc-500 hover:text-zinc-800"
                    }`}
                    onClick={() => setShellView(id)}
                  >
                    {label}
                  </button>
                ))}
              </nav>
              <span className="hidden h-4 w-px bg-zinc-200 sm:block" />
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge tone={apiKeyConfigured ? "teal" : "amber"}>
                  {apiKeyConfigured == null
                    ? "检测中"
                    : apiKeyConfigured
                      ? "Chat Ready"
                      : "离线 Fixture"}
                </Badge>
                {shellView === "chat" ? (
                  <>
                    <Badge tone={indexStats?.remote ? "sky" : "neutral"}>
                      {indexStats?.embeddingModel
                        ? `Embed · ${indexStats.embeddingModel}`
                        : "Embed · local-hash"}
                    </Badge>
                    <Badge tone={phaseTone(phase)} className="gap-1.5">
                      <span
                        className={`inline-block h-1.5 w-1.5 rounded-full bg-current ${
                          busy || phase === "awaiting_hitl"
                            ? "desk-status-dot"
                            : ""
                        }`}
                      />
                      {phaseLabel(phase)}
                    </Badge>
                  </>
                ) : null}
              </div>
            </div>
            {prefs.showSubtitle ? (
              <p className="mt-1 hidden text-xs text-zinc-500 sm:block">
                个人知识工作台 · 混合检索 · Tool 可观测 · HITL 待办
              </p>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="hidden font-mono text-[11px] text-zinc-400 xl:inline">
              {noteCount} notes · {indexStats?.chunkCount ?? 0} chunks ·{" "}
              {toolCount} tools · {artifactCount} arts
            </span>
            {shellView === "chat" ? (
              <Button
                size="sm"
                variant="ghost"
                className="lg:hidden"
                onClick={() => setSessionsOpen(true)}
              >
                会话
              </Button>
            ) : null}
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setNotesOpen(true)}
            >
              <BookOpen className="h-3.5 w-3.5" strokeWidth={1.75} />
              知识库
            </Button>
            {shellView === "chat" ? (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => void newSession()}
              >
                <MessageSquarePlus className="h-3.5 w-3.5" strokeWidth={1.75} />
                新会话
              </Button>
            ) : (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShellView("settings")}
              >
                <Settings2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                设置
              </Button>
            )}
          </div>
        </div>
      </header>

      {runtimeError ? (
        <div className="border-b border-rose-200 bg-rose-50 px-4 py-2 text-xs leading-relaxed text-rose-950">
          <span className="font-semibold">运行异常：</span>
          {runtimeError}
        </div>
      ) : null}

      {prefs.showFixtureBanner &&
      !apiKeyConfigured &&
      apiKeyConfigured !== null &&
      !runtimeError ? (
        <div className="border-b border-amber-200/80 bg-amber-50 px-4 py-2 text-xs text-amber-950">
          当前为<strong>离线 Fixture</strong>
          模式：快捷句可全流程跑通（检索 / 表格 / HITL），真实工具会落库。配置{" "}
          <code className="font-mono">DEEPSEEK_API_KEY</code>{" "}
          后自动改走真模型，不再调用 mock。向量未配时用 local-hash。
        </div>
      ) : null}

      {shellView === "home" ? (
        <DeskHome
          onOpenChat={() => setShellView("chat")}
          onOpenNotes={() => setNotesOpen(true)}
        />
      ) : null}

      {shellView === "settings" ? (
        <DeskSettings onBack={() => setShellView("home")} />
      ) : null}

      {shellView === "chat" ? (
        <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[210px_minmax(0,1.2fr)_minmax(240px,0.78fr)_minmax(260px,0.9fr)]">
          <div className="desk-fade-up hidden min-h-0 overflow-hidden lg:block">
            <SessionSidebar />
          </div>
          <Panel
            title="会话"
            subtitle="SSE 流式 · 点 [n] 跳转引用"
            className="desk-fade-up desk-fade-up-delay-1 min-h-0 max-h-[48vh] overflow-hidden lg:max-h-none"
          >
            <ChatPanel />
          </Panel>
          <Panel
            title="工具时间线"
            subtitle="参数 · 耗时 · HITL"
            className="desk-fade-up desk-fade-up-delay-2 min-h-0 max-h-[26vh] overflow-hidden lg:max-h-none"
            bodyClassName="min-h-0 overflow-y-auto overscroll-contain [scrollbar-width:thin]"
          >
            <ToolTimeline />
          </Panel>
          <Panel
            title="制品 / 引用"
            subtitle="Generative UI"
            className="desk-fade-up desk-fade-up-delay-3 min-h-0 max-h-[26vh] overflow-hidden lg:max-h-none"
            bodyClassName="min-h-0 overflow-hidden"
          >
            <ArtifactsPanel />
          </Panel>
        </div>
      ) : null}
    </div>
  );
}
