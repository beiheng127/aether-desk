"use client";

import { Button } from "@/components/ui/button";
import {
  BookOpen,
  GitBranch,
  MessageSquare,
  Radar,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

const CAPABILITIES = [
  {
    icon: Radar,
    title: "混合 RAG 检索",
    lead: "关键词兜住专有名词，向量覆盖同义改写。",
    detail:
      "默认 Hybrid + RRF 融合；回答带可点击引用角标 [n]，点开即可跳到对应笔记片段。",
  },
  {
    icon: MessageSquare,
    title: "SSE Tool Calling",
    lead: "文本流与工具状态机同通道推送。",
    detail:
      "左侧会话、中间对话、右侧工具轨迹与制品分区建模——不是单栏聊天框，全程可观测。",
  },
  {
    icon: ShieldCheck,
    title: "HITL 写操作",
    lead: "Agent 只能提议，不能静默改库。",
    detail:
      "创建待办、保存笔记等写操作进入「待确认」；你批准后才 insert / 重建索引，拒绝则取消。",
  },
  {
    icon: BookOpen,
    title: "本地知识库",
    lead: "笔记即长期记忆，落在本机 SQLite。",
    detail:
      "增删改后自动分块与向量化；会话可导出 JSON、导入回放，演示与复习都能闭环。",
  },
] as const;

const FLOW = [
  { step: "01", title: "提问", desc: "自然语言目标" },
  { step: "02", title: "检索 / 工具", desc: "Hybrid 或调用工具" },
  { step: "03", title: "确认", desc: "HITL 批准写操作" },
  { step: "04", title: "沉淀", desc: "引用 · 制品 · 笔记" },
] as const;

export function DeskHome({
  onOpenChat,
  onOpenNotes,
}: {
  onOpenChat: () => void;
  onOpenNotes?: () => void;
}) {
  return (
    <div className="desk-home min-h-0 flex-1 overflow-y-auto overscroll-contain">
      <div className="desk-home-atmosphere pointer-events-none" aria-hidden />

      {/* Hero: brand first, asymmetric */}
      <section className="relative mx-auto grid max-w-6xl gap-10 px-5 pb-6 pt-10 sm:px-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-end lg:gap-14 lg:pb-10 lg:pt-14">
        <div className="desk-home-reveal" style={{ ["--i" as string]: 0 }}>
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-teal-800">
            Aether Desk
          </p>
          <h2 className="desk-home-display mt-4 max-w-[14ch] text-[2.35rem] font-semibold leading-[1.08] tracking-[-0.035em] text-zinc-900 sm:text-5xl lg:text-[3.25rem]">
            本地优先的个人知识工作台
          </h2>
          <p className="mt-5 max-w-[42ch] text-[15px] leading-relaxed text-zinc-600 sm:text-base">
            把笔记、混合检索、工具调用与人工确认放在同一张工作台里：用来每天沉淀面试材料与学习笔记，而不是一次性聊天 Demo。
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button
              variant="primary"
              className="desk-home-cta h-10 px-5 text-sm shadow-sm shadow-teal-900/15"
              onClick={onOpenChat}
            >
              进入对话工作台
            </Button>
            {onOpenNotes ? (
              <Button
                variant="secondary"
                className="h-10 px-4 text-sm"
                onClick={onOpenNotes}
              >
                打开知识库
              </Button>
            ) : null}
          </div>
          <p className="mt-4 text-xs text-zinc-500">
            无 Chat Key 也可跑离线 Fixture；配置 Key 后自动切真模型。
          </p>
        </div>

        <aside
          className="desk-home-reveal desk-home-panel relative overflow-hidden rounded-2xl border border-zinc-200/90 bg-white/80 p-5 shadow-[0_20px_50px_-28px_rgba(15,23,42,0.35)] backdrop-blur-sm sm:p-6"
          style={{ ["--i" as string]: 1 }}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-zinc-800">
              一次回合在做什么
            </span>
            <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-teal-800">
              <span className="desk-home-live-dot h-1.5 w-1.5 rounded-full bg-teal-600" />
              Live loop
            </span>
          </div>
          <ol className="mt-5 space-y-0">
            {[
              {
                t: "用户提问",
                d: "会话区发送目标",
                icon: MessageSquare,
              },
              {
                t: "Agent 调工具",
                d: "检索 / 对比 / 抓网页…",
                icon: Sparkles,
              },
              {
                t: "SSE 推流",
                d: "文本 · 工具态 · 制品同步",
                icon: GitBranch,
              },
              {
                t: "HITL 落库",
                d: "写操作等你批准",
                icon: ShieldCheck,
              },
            ].map((row, i) => (
              <li key={row.t} className="relative flex gap-3 pb-5 last:pb-0">
                {i < 3 ? (
                  <span
                    className="absolute left-[15px] top-8 h-[calc(100%-1.25rem)] w-px bg-gradient-to-b from-teal-700/40 to-zinc-200"
                    aria-hidden
                  />
                ) : null}
                <span className="relative z-[1] flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-teal-800/15 bg-teal-50 text-teal-800">
                  <row.icon className="h-3.5 w-3.5" strokeWidth={1.75} />
                </span>
                <div className="min-w-0 pt-0.5">
                  <div className="text-sm font-semibold text-zinc-900">
                    {row.t}
                  </div>
                  <div className="mt-0.5 text-xs text-zinc-500">{row.d}</div>
                </div>
              </li>
            ))}
          </ol>
        </aside>
      </section>

      {/* Purpose */}
      <section
        className="desk-home-reveal relative mx-auto max-w-6xl border-t border-zinc-200/80 px-5 py-10 sm:px-8 sm:py-12"
        style={{ ["--i" as string]: 2 }}
      >
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-zinc-500">
              主要目的
            </h3>
            <p className="desk-home-display mt-3 text-2xl font-semibold tracking-tight text-zinc-900 sm:text-[1.75rem] sm:leading-snug">
              让知识沉淀可检索、可引用、可回放——Agent 只是工作台上的助手。
            </p>
          </div>
          <div className="space-y-4 text-[15px] leading-relaxed text-zinc-600">
            <p>
              Aether Desk
              面向个人场景：复习面试、整理方案、把「打算做的事」落成可批准的任务。所有数据进本机
              SQLite，刷新后会话与工具轨迹仍在。
            </p>
            <p>
              产品原则是<strong className="font-semibold text-zinc-800">可观测</strong>
              （工具时间线）与<strong className="font-semibold text-zinc-800">可确认</strong>
              （HITL）：模型可以建议，写库必须经过你。
            </p>
          </div>
        </div>
      </section>

      {/* Capabilities */}
      <section
        className="desk-home-reveal relative mx-auto max-w-6xl px-5 pb-4 sm:px-8"
        style={{ ["--i" as string]: 3 }}
      >
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-zinc-500">
              具体功能
            </h3>
            <p className="mt-2 text-lg font-semibold tracking-tight text-zinc-900">
              四件事做成一条完整链路
            </p>
          </div>
        </div>
        <div className="grid gap-px overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-200/80 sm:grid-cols-2">
          {CAPABILITIES.map((c, i) => (
            <article
              key={c.title}
              className="desk-home-cap bg-[var(--surface)] p-5 sm:p-6"
              style={{ ["--i" as string]: i }}
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-50 text-teal-800 ring-1 ring-teal-800/10">
                <c.icon className="h-4 w-4" strokeWidth={1.75} />
              </div>
              <h4 className="mt-4 text-[15px] font-semibold text-zinc-900">
                {c.title}
              </h4>
              <p className="mt-1.5 text-sm font-medium text-zinc-800">{c.lead}</p>
              <p className="mt-2 text-sm leading-relaxed text-zinc-500">
                {c.detail}
              </p>
            </article>
          ))}
        </div>
      </section>

      {/* Flow strip */}
      <section
        className="desk-home-reveal relative mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-12"
        style={{ ["--i" as string]: 4 }}
      >
        <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-zinc-500">
          推荐用法
        </h3>
        <div className="mt-5 grid gap-3 sm:grid-cols-4">
          {FLOW.map((f) => (
            <div
              key={f.step}
              className="rounded-xl border border-zinc-200/90 bg-white/70 px-4 py-4"
            >
              <span className="font-mono text-[11px] font-medium text-teal-800">
                {f.step}
              </span>
              <div className="mt-2 text-sm font-semibold text-zinc-900">
                {f.title}
              </div>
              <div className="mt-1 text-xs text-zinc-500">{f.desc}</div>
            </div>
          ))}
        </div>
        <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-zinc-200/80 pt-8">
          <Button variant="primary" className="h-10 px-5" onClick={onOpenChat}>
            开始对话
          </Button>
          <span className="text-xs text-zinc-500">
            试试：「用混合检索查 Agent Loop，并引用编号回答要点」
          </span>
        </div>
      </section>
    </div>
  );
}
