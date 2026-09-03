import { notes } from "@/lib/db/schema";
import type { AppDb } from "@/lib/db/index";
import { count, eq } from "drizzle-orm";
import { nanoid } from "nanoid";

export const SEED_NOTES = [
  {
    title: "Agent Loop 工程笔记",
    tags: "agent,tool,frontend",
    content: `Agent Loop = 规划 → 选工具 → 执行 → 观察 → 再规划/回答。
前端必须让每一步可观测：pending / running / result / error。
写操作要 HITL（Human in the Loop），避免 Agent 自动改状态。
结构化结果用 Generative UI（卡片/表格），不要只堆 Markdown。`,
  },
  {
    title: "Aether Desk 产品原则",
    tags: "product,desk",
    content: `Aether Desk 是个人知识工作台，不是玩具聊天框。
三大实体：会话消息、工具运行记录、制品（Artifacts）。
知识库笔记可被 search_notes 检索；create_task_card 产出可确认待办。
本地 SQLite 持久化，刷新不丢；适合个人笔记检索与日常自用。`,
  },
  {
    title: "SSR vs CSR 对比备忘",
    tags: "nextjs,ssr,csr",
    content: `SSR：首屏 HTML 完整，利于 SEO 与 LCP；服务器压力更大。
CSR：包体积与 hydration 成本高，交互后体验灵活。
App Router 推荐：Server Components 默认，客户端边界按交互切开。
流式 AI 回复通常在客户端消费 SSE，服务端负责编排与工具执行。`,
  },
  {
    title: "RAG 落地清单",
    tags: "rag,search",
    content: `最小可用：笔记分片 + 关键词检索 + 引用展示。
进阶：Embedding + 向量相似度 + 重排（RRF 融合）。
Aether Desk 默认 hybrid：关键词（可解释）+ 向量（同义改写）；
无远程 Embedding Key 时用 local-hash 兜底，语义弱于真 Embedding，但保证无 Key 可跑通。`,
  },
  {
    title: "SSE 流式协议设计",
    tags: "sse,api,stream",
    content: `Aether Desk 的 /api/chat 使用 SSE 推送多类事件：
session（会话 id）、text-delta（流式文本）、tool-run（工具状态）、artifact（制品）、done（结束）。
前端 Zustand 订阅同一通道，保证工具事件与文本增量时序一致。
错误用 error 事件返回，避免整段 JSON 阻塞 UI。`,
  },
  {
    title: "HITL 写操作规范",
    tags: "hitl,safety,agent",
    content: `凡是会改用户数据的操作（create_task_card、未来可能的 delete/export）必须 HITL：
1. 工具先落库 awaiting_approval + artifact pending
2. UI 展示参数与预览
3. 用户点批准才执行副作用
原则：Agent 可以建议，但不能在未确认时改库。`,
  },
  {
    title: "前端 Agent 状态机",
    tags: "frontend,state,zustand",
    content: `Desk phase：idle → thinking → tooling → streaming → awaiting_hitl → idle/error。
工具时间线与 phase 解耦：一个回合可能多次 tool-call。
streamingText 与 messages 分离，done 后再合并进历史消息。
停止生成用 AbortController 中断 fetch reader。`,
  },
  {
    title: "知识库分块与索引策略",
    tags: "rag,chunk,index",
    content: `笔记按段落/长度分块写入 note_chunks，每块单独 embedding。
保存笔记时自动 indexNote；全量重建走 /api/notes/reindex。
检索默认 hybrid：关键词命中标题加权 + 向量余弦 + RRF 融合。
引用展示要带 snippet、score、mode（keyword/vector/hybrid）。`,
  },
  {
    title: "Generative UI 制品规范",
    tags: "ui,artifact,generative",
    content: `制品类型：task_card（待办）、table_card（对比表）、note（引用/笔记）。
长表格、待办清单应走 summarize_diff / create_task_card，落在右侧制品区。
对话区只放摘要 + 引用角标，避免一条消息撑满屏幕。
用户点 [n] 应跳到对应 citation 卡。`,
  },
  {
    title: "会话导出 JSON 功能需求",
    tags: "feature,export,session,workflow",
    content: `需求：在会话列表增加「导出 JSON」，包含 messages、toolRuns、artifacts 元数据。
方案 A（客户端）：GET /api/sessions/:id 已有快照，前端 blob 下载，改动小。
方案 B（服务端）：新增 /api/sessions/:id/export 流式写文件，适合大会话。
安全：导出不含 API Key；写操作仍要 HITL，导出属于读操作可直接做。
验收：导出文件可在另一环境导入并回放会话。`,
  },
  {
    title: "Tool Calling 实现要点",
    tags: "agent,tool",
    content: `模型选工具，工具 execute 在服务端读写 DB；前端只消费可观测事件。
多步 loop 用 stepCount 限制防死循环。
失败要落 tool-run error 状态，不能静默吞掉。`,
  },
  {
    title: "DeepSeek 接入与 Prompt 约束",
    tags: "deepseek,model,prompt",
    content: `默认 DEEPSEEK_API_KEY + https://api.deepseek.com/v1 + deepseek-chat。
系统 Prompt 要求：先 search_notes 再答；引用用 [n]；对比用 summarize_diff；
待办用 create_task_card 并提醒用户批准。不要编造未调用的工具结果。`,
  },
  {
    title: "工作台自测清单（3 分钟）",
    tags: "qa,workflow",
    content: `1) 打开四栏确认职责 2) 混合检索 + 引用回答 3) 查看工具时间线
4) 批准一条待办 5) 打开知识库确认笔记已入库
可选：导出会话 JSON，再导入回放。`,
  },
  {
    title: "离线 Fixture 使用说明",
    tags: "fixture,offline,qa",
    content: `无 Chat API Key 时 /api/chat 自动走离线 fixture（真实工具落库）。
有 DEEPSEEK/OPENAI/AI_GATEWAY 可用 Key 时绝不走 mock。
快捷句与 fixtures/catalog 一一对应，覆盖检索、对比表、双 HITL、全流程演示。`,
  },
  {
    title: "过敏原展示规范（HIS）",
    tags: "his,allergy,frontend",
    content: `过敏信息需在医嘱开立、处方、护理等多处消费。
颜色/文案映射要集中常量，避免分叉副本。
缺口：若云药房链路未接通，面试应诚实说明边界。`,
  },
  {
    title: "妊娠风险色映射备忘",
    tags: "his,pregnancy,ui",
    content: `妊娠风险等级对应固定色值与文案；变更需同步字典与前端常量。
回归：列表、详情、打印三处色值一致。`,
  },
  {
    title: "医嘱签署 FH0102.02 要点",
    tags: "his,order,sign",
    content: `签署接口需防重复提交；前端按钮 loading + 服务端幂等。
失败要可重试并保留草稿态。`,
  },
  {
    title: "收费汇总 CashReceiptSummary",
    tags: "his,billing",
    content: `汇总页关注口径：时间范围、院区、支付方式。
导出与打印共用同一聚合结果，避免两套 SQL。`,
  },
  {
    title: "外配处方 g3a/gmc 分叉",
    tags: "his,prescription,fork",
    content: `g3a 与 gmc 在外配处方校验字段上有分叉；改公共组件前先对齐产品口径。
测试数据要覆盖两边最小字段集。`,
  },
  {
    title: "Zustand 订阅粒度实践",
    tags: "zustand,frontend,perf",
    content: `按字段选择器订阅，避免整 store 变更导致 ChatPanel 重渲染。
phase / streamingText / toolRuns 分离更新。`,
  },
  {
    title: "AbortController 与会话切换",
    tags: "abort,session,bugfix",
    content: `切会话或新建会话必须 abort 旧流，再加载目标会话快照。
停止生成后应清空 streamingText 并与 DB 对齐。`,
  },
  {
    title: "本地 Hash Embedding 局限",
    tags: "embedding,rag,local",
    content: `local-hash 保证无远程 Key 可跑通 hybrid。
同义改写能力弱；接真 Embedding 后务必重建索引并核对 dims。`,
  },
  {
    title: "Eval Hit@k 怎么读",
    tags: "eval,rag,metric",
    content: `keyword 与 hybrid 分列对比；关注 Top1/Top3。
种子笔记标题应稳定，避免改标题导致 expect 失效。`,
  },
  {
    title: "制品区与对话区职责",
    tags: "ui,artifact,ux",
    content: `对话：摘要 + 引用角标；制品：表格/待办/长引用。
点 [n] 跳转 citation 卡，形成可解释闭环。`,
  },
  {
    title: "save_note 批准幂等",
    tags: "hitl,note,bugfix",
    content: `批准前将 toolRun 置 running，失败则删孤儿笔记并标 error，避免重复 insert。
前端仅在 ok 后刷新知识库。`,
  },
  {
    title: "面试叙事：可观测 Agent",
    tags: "interview,story",
    content: `一句话：不是聊天框，是可观测工具循环 + HITL + 知识库证据。
演示顺序：检索引用 → 对比表 → 待办批准 → 存笔记批准。`,
  },
  {
    title: "Next App Router 边界",
    tags: "nextjs,rsc,boundary",
    content: `默认 Server Components；带交互的 Chat/Store 放 client。
流式 API 用 nodejs runtime + force-dynamic。`,
  },
  {
    title: "SQLite 个人库选型",
    tags: "sqlite,storage",
    content: `单机演示优先 SQLite：零运维、可文件拷贝。
注意 better-sqlite3 与 Node 架构一致（arm64）。`,
  },
  {
    title: "RRF 融合直觉",
    tags: "rrf,rag,rank",
    content: `倒数排名融合降低单一通路偏差。
面试可画：keyword 列表 ⊕ vector 列表 → RRF → TopK。`,
  },
  {
    title: "工具时间线 UX",
    tags: "timeline,ux,agent",
    content: `running / result / error / awaiting_approval 四态要一眼可辨。
批准/拒绝就地操作，失败保留可重试。`,
  },
  {
    title: "Fixture 与真模型切换契约",
    tags: "fixture,contract,ai",
    content: `门控：hasApiKey() 真 → streamText；假 → fixture runner。
占位 Key（sk-your-key）视为未配置。
UI 在离线模式允许发送并提示「离线测试数据」。`,
  },
] as const;

export function seedIfEmpty(db: AppDb) {
  ensureSeedNotes(db);
}

/** 按标题 upsert：已有库也会补全新增种子笔记 */
export function ensureSeedNotes(db: AppDb): { inserted: number; total: number } {
  const now = Date.now();
  let inserted = 0;

  for (const note of SEED_NOTES) {
    const existing = db
      .select({ id: notes.id })
      .from(notes)
      .where(eq(notes.title, note.title))
      .get();
    if (existing) continue;

    db.insert(notes)
      .values({
        id: nanoid(),
        title: note.title,
        content: note.content,
        tags: note.tags,
        createdAt: now,
        updatedAt: now,
      })
      .run();
    inserted += 1;
  }

  const [{ total }] = db.select({ total: count() }).from(notes).all();

  return { inserted, total };
}
