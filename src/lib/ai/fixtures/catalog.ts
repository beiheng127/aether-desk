/**
 * 离线 Chat Fixture 目录（仅无 API Key 时启用）。
 * 每条剧本可走通真实工具路径：检索 / 对比表 / 待办 HITL / 存笔记 HITL。
 */

export type FixtureToolName =
  | "search_notes"
  | "summarize_diff"
  | "create_task_card"
  | "save_note";

export type FixtureToolCall = {
  name: FixtureToolName;
  args: Record<string, unknown>;
};

export type ChatFixture = {
  id: string;
  title: string;
  /** 快捷芯片文案 */
  label: string;
  hint?: string;
  /** 用户输入（也可被 match 命中） */
  prompt: string;
  /** 命中关键词（不区分大小写） */
  keywords: string[];
  tools: FixtureToolCall[];
  /** 最终回复（可含 [n] 引用） */
  answer: string;
};

function search(query: string, limit = 5): FixtureToolCall {
  return {
    name: "search_notes",
    args: { query, limit, mode: "hybrid" },
  };
}

function table(
  title: string,
  leftLabel: string,
  rightLabel: string,
  dimensions: Array<{ name: string; left: string; right: string }>,
): FixtureToolCall {
  return {
    name: "summarize_diff",
    args: { title, leftLabel, rightLabel, dimensions },
  };
}

function tasks(title: string, items: string[]): FixtureToolCall {
  return { name: "create_task_card", args: { title, items } };
}

function note(title: string, content: string, tags?: string): FixtureToolCall {
  return {
    name: "save_note",
    args: { title, content, tags: tags ?? "fixture,offline" },
  };
}

/** 30+ 全流程可跑通剧本 */
export const CHAT_FIXTURES: ChatFixture[] = [
  {
    id: "fx-agent-loop-cite",
    title: "Agent Loop 检索引用",
    label: "混合检索 + 引用",
    prompt: "用混合检索查 Agent Loop，并引用编号回答要点",
    keywords: ["agent loop", "混合检索", "引用"],
    tools: [search("Agent Loop 规划工具执行观察")],
    answer:
      "根据知识库 [1]：Agent Loop = 规划 → 选工具 → 执行 → 观察 → 再规划/回答。前端要把每步做成可观测状态，写操作必须 HITL。\n\n（离线 fixture · 无 Chat Key）",
  },
  {
    id: "fx-ssr-csr-table",
    title: "SSR vs CSR 对比表",
    label: "对比表制品",
    prompt: "对比 SSR 与 CSR，用表格呈现",
    keywords: ["ssr", "csr", "对比", "表格"],
    tools: [
      search("SSR CSR 对比 SEO hydration"),
      table("SSR vs CSR", "SSR", "CSR", [
        { name: "首屏", left: "HTML 完整，利于 LCP/SEO", right: "依赖 hydration" },
        { name: "服务器压力", left: "更高", right: "更低" },
        { name: "交互灵活度", left: "边界需切开", right: "客户端更自由" },
      ]),
    ],
    answer:
      "已检索相关笔记 [1]，并生成右侧对比表。SSR 利于首屏与 SEO，CSR 利于复杂交互；App Router 推荐默认 RSC。\n\n（离线 fixture）",
  },
  {
    id: "fx-workflow-export",
    title: "会话导出工作流",
    label: "工作流：会话导出",
    hint: "检索 → 表格 → 待办 HITL",
    prompt:
      "我要给 Aether Desk 做「会话导出 JSON」功能。请检索知识库里的相关笔记，给出实现步骤，用表格对比两种导出方案，并生成待办让我确认。",
    keywords: ["会话导出", "json", "工作流", "导出"],
    tools: [
      search("会话导出 JSON 导入回放"),
      table("导出会话方案", "客户端 Blob", "服务端流式", [
        { name: "改动成本", left: "小，复用 GET 快照", right: "新增 export 路由" },
        { name: "大会话", left: "内存压力大", right: "更合适" },
        { name: "安全", left: "不含 Key", right: "不含 Key" },
      ]),
      tasks("会话导出落地", [
        "确认导出字段：messages / toolRuns / artifacts",
        "实现前端 Blob 下载",
        "补导入回放自测用例",
      ]),
    ],
    answer:
      "已按知识库 [1] 给出方案对比，并生成 3 条待办（需批准）。建议先走客户端 Blob 方案验证验收。\n\n（离线 fixture）",
  },
  {
    id: "fx-hitl-tasks",
    title: "学习待办 HITL",
    label: "生成待办（HITL）",
    prompt: "根据 Agent Loop 笔记生成 3 条学习待办",
    keywords: ["待办", "学习", "hitl", "任务"],
    tools: [
      search("Agent Loop"),
      tasks("Agent Loop 学习清单", [
        "画出 phase 状态机",
        "手写一次 tool-run 时间线",
        "演示一条 HITL 批准/拒绝",
      ]),
    ],
    answer:
      "已检索 [1]，并生成 3 条待办卡片。请在工具时间线或制品区点「批准」。\n\n（离线 fixture）",
  },
  {
    id: "fx-save-note-hitl",
    title: "总结并存笔记",
    label: "总结并存笔记",
    hint: "需批准后才写入",
    prompt:
      "检索知识库里关于 HITL 的笔记，用两三句话总结核心原则，再调用 save_note 把总结存成草稿标题「HITL 要点」，等我在工具时间线批准。",
    keywords: ["hitl", "存笔记", "save_note", "要点"],
    tools: [
      search("HITL 写操作 批准 awaiting_approval"),
      note(
        "HITL 要点",
        "写操作先 awaiting_approval；UI 展示参数；用户批准后才副作用。Agent 可建议，不可静默改库。",
        "hitl,fixture",
      ),
    ],
    answer:
      "HITL 原则见 [1]：建议与执行分离，批准后才落库。已提交「HITL 要点」草稿，请批准后写入知识库。\n\n（离线 fixture）",
  },
  {
    id: "fx-full-demo",
    title: "面试全流程演示",
    label: "演示剧本（全流程）",
    hint: "检索→表格→待办→存笔记",
    prompt: `请按顺序演示工作台能力（每步真正调用工具，不要假装）：
1. 用混合检索查找「Agent Loop」相关笔记，回答时带引用编号；
2. 用表格对比「会话导出 JSON」的两种实现方案；
3. 生成 2 条可执行待办（需我批准）；
4. 把本轮结论用 save_note 存为草稿「Demo 结论」，等我批准后再写入知识库。
最后用简短条目说明你调用了哪些工具。`,
    keywords: ["演示", "全流程", "demo 结论", "按顺序"],
    tools: [
      search("Agent Loop"),
      table("会话导出 JSON", "客户端", "服务端", [
        { name: "复杂度", left: "低", right: "中" },
        { name: "适用", left: "日常演示", right: "大会话" },
      ]),
      tasks("Demo 待办", [
        "验收检索引用角标可点击",
        "批准一条待办并确认状态变更",
      ]),
      note(
        "Demo 结论",
        "本轮演示了 search_notes → summarize_diff → create_task_card → save_note。写操作均需 HITL。",
        "demo,fixture",
      ),
    ],
    answer:
      "全流程完成：\n1. 检索 Agent Loop [1]\n2. 导出方案对比表\n3. 2 条待办待批准\n4. 「Demo 结论」笔记草稿待批准\n工具：search_notes / summarize_diff / create_task_card / save_note\n\n（离线 fixture）",
  },
  {
    id: "fx-rag-checklist",
    title: "RAG 落地清单",
    label: "RAG 清单",
    prompt: "检索 RAG 落地清单，总结 hybrid 与 local-hash 的关系",
    keywords: ["rag", "hybrid", "local-hash", "embedding"],
    tools: [search("RAG 分片 embedding RRF 混合检索")],
    answer:
      "见 [1]：最小可用是分片+关键词；进阶加向量与 RRF。无远程 Embedding 时用 local-hash，保证无 Key 可检索，但语义弱于真 Embedding。\n\n（离线 fixture）",
  },
  {
    id: "fx-sse-protocol",
    title: "SSE 协议说明",
    label: "SSE 协议",
    prompt: "SSE 流式协议有哪些事件？检索笔记后回答",
    keywords: ["sse", "text-delta", "流式", "事件"],
    tools: [search("SSE 流式 text-delta tool-run artifact")],
    answer:
      "据 [1]：session / text-delta / tool-run / artifact / done / error。前端 Zustand 订阅同一通道，保证时序一致。\n\n（离线 fixture）",
  },
  {
    id: "fx-frontend-state",
    title: "前端状态机",
    label: "状态机",
    prompt: "前端 Agent 状态机 phase 怎么设计？",
    keywords: ["状态机", "phase", "zustand", "streaming"],
    tools: [search("前端 Agent 状态机 Zustand phase streaming")],
    answer:
      "[1]：idle → thinking → tooling → streaming → awaiting_hitl → idle/error。streamingText 与 messages 分离，done 后再合并。\n\n（离线 fixture）",
  },
  {
    id: "fx-chunk-index",
    title: "分块索引",
    label: "分块索引",
    prompt: "知识库分块与重建索引怎么做？",
    keywords: ["分块", "索引", "reindex", "note_chunks"],
    tools: [search("知识库分块 note_chunks 重建索引")],
    answer:
      "[1]：按段落/长度分块；保存时 indexNote；全量走 /api/notes/reindex。引用需带 score 与 mode。\n\n（离线 fixture）",
  },
  {
    id: "fx-product-principles",
    title: "产品原则",
    label: "产品原则",
    prompt: "Aether Desk 产品原则是什么？",
    keywords: ["产品原则", "制品", "三大实体"],
    tools: [search("Aether Desk 产品原则 制品 会话")],
    answer:
      "[1]：三大实体是会话消息、工具运行、制品。知识库可被检索，写操作 HITL，本地 SQLite 持久化。\n\n（离线 fixture）",
  },
  {
    id: "fx-tool-calling",
    title: "Tool Calling",
    label: "Tool Calling",
    prompt: "Tool Calling 实现要点有哪些？",
    keywords: ["tool calling", "stepcount", "工具失败"],
    tools: [search("Tool Calling stepCount 工具失败")],
    answer:
      "[1]：模型选工具，execute 在服务端；stepCount 防死循环；失败要落 error 状态。\n\n（离线 fixture）",
  },
  {
    id: "fx-deepseek-prompt",
    title: "DeepSeek Prompt",
    label: "模型 Prompt",
    prompt: "DeepSeek 接入与 Prompt 约束是什么？",
    keywords: ["deepseek", "prompt", "系统提示"],
    tools: [search("DeepSeek 接入 Prompt")],
    answer:
      "[1]：先 search_notes 再答；引用 [n]；对比用表格工具；待办/存笔记需提醒批准。\n\n（离线 fixture）",
  },
  {
    id: "fx-qa-checklist",
    title: "3 分钟自测",
    label: "自测清单",
    prompt: "工作台 3 分钟自测清单有哪些？生成待办",
    keywords: ["自测", "3 分钟", "qa"],
    tools: [
      search("工作台自测清单"),
      tasks("3 分钟自测", [
        "四栏职责一眼看懂",
        "混合检索 + 引用",
        "批准一条待办",
      ]),
    ],
    answer:
      "已按 [1] 生成自测待办。建议按序点完再考虑导出会话。\n\n（离线 fixture）",
  },
  {
    id: "fx-generative-ui",
    title: "Generative UI",
    label: "Generative UI",
    prompt: "Generative UI 制品规范是什么？用表格说明类型",
    keywords: ["generative", "制品规范", "task_card"],
    tools: [
      search("Generative UI 制品"),
      table("制品类型", "用途", "HITL", [
        { name: "task_card", left: "待办清单", right: "需要" },
        { name: "table_card", left: "对比/结构化", right: "否" },
        { name: "note", left: "引用/草稿", right: "save_note 需要" },
      ]),
    ],
    answer:
      "规范见 [1]，对比表已生成。对话区放摘要，重内容进制品区。\n\n（离线 fixture）",
  },
  {
    id: "fx-his-allergy",
    title: "过敏包消费",
    label: "HIS·过敏",
    prompt: "检索过敏相关笔记；若无命中则说明缺口，并生成补笔记待办",
    keywords: ["过敏", "allergy", "his"],
    tools: [
      search("过敏 包 医嘱"),
      tasks("补齐过敏知识", [
        "整理过敏原颜色映射字段",
        "记录 g3a/gmc 分叉差异",
      ]),
    ],
    answer:
      "已尝试检索过敏相关笔记。若命中不足，请批准待办后补写知识库，再用混合检索验证。\n\n（离线 fixture）",
  },
  {
    id: "fx-pregnancy-risk",
    title: "妊娠风险色",
    label: "HIS·妊娠色",
    prompt: "查一下妊娠风险颜色相关知识，并做两条待办",
    keywords: ["妊娠", "风险色", "pregnancy"],
    tools: [
      search("妊娠 风险 颜色"),
      tasks("妊娠风险色跟进", [
        "核对色值与文案映射表",
        "补一条可检索笔记",
      ]),
    ],
    answer:
      "已检索并生成跟进待办。演示重点：缺口可见 + HITL 闭环。\n\n（离线 fixture）",
  },
  {
    id: "fx-order-sign",
    title: "医嘱签署",
    label: "HIS·签署",
    prompt: "医嘱签署 FH0102 相关流程怎么讲？检索后给对比表",
    keywords: ["签署", "fh0102", "医嘱", "ordersign"],
    tools: [
      search("医嘱 签署 签名"),
      table("签署链路", "前端", "后端", [
        { name: "入口", left: "签署按钮/抽屉", right: "FH 接口" },
        { name: "风险", left: "重复点击", right: "幂等/状态机" },
      ]),
    ],
    answer:
      "已给出签署链路对比表。面试可强调状态机与防重复提交。\n\n（离线 fixture）",
  },
  {
    id: "fx-hybrid-vs-keyword",
    title: "检索模式对比",
    label: "检索模式",
    prompt: "对比 hybrid / keyword / vector 三种检索模式",
    keywords: ["keyword", "vector", "检索模式"],
    tools: [
      search("RAG hybrid"),
      table("检索模式", "可解释性", "同义能力", [
        { name: "keyword", left: "高", right: "弱" },
        { name: "vector", left: "中", right: "强（需真 Embedding）" },
        { name: "hybrid", left: "高", right: "中-强（RRF）" },
      ]),
    ],
    answer:
      "默认 hybrid：关键词加权 + 向量 + RRF。无远程 Embedding 时向量侧为 local-hash。\n\n（离线 fixture）",
  },
  {
    id: "fx-abort-story",
    title: "停止生成",
    label: "停止生成",
    prompt: "停止生成时前后端各自做什么？检索 SSE 笔记后回答",
    keywords: ["停止", "abort", "中止"],
    tools: [search("SSE 流式"), search("前端 Agent 状态机")],
    answer:
      "前端 AbortController 中断 reader；服务端 abortSignal 停 stream；客户端应 reload 会话避免半截态。见 [1][2]。\n\n（离线 fixture）",
  },
  {
    id: "fx-citation-jump",
    title: "引用跳转",
    label: "引用跳转",
    prompt: "检索 Agent Loop，并说明点 [n] 会发生什么",
    keywords: ["引用", "角标", "citation", "[1]"],
    tools: [search("Agent Loop"), search("Generative UI")],
    answer:
      "回答带 [1]；点击角标会选中对应 citation 制品。请在右侧制品区验证跳转。\n\n（离线 fixture）",
  },
  {
    id: "fx-task-only",
    title: "纯待办",
    label: "纯待办",
    prompt: "给我生成面试前 4 条准备待办",
    keywords: ["面试前", "准备待办", "4 条"],
    tools: [
      tasks("面试前准备", [
        "背熟 Agent Loop 与 HITL",
        "跑通离线 fixture 全流程",
        "准备 Loom 工单四阶段口述",
        "导出一份会话 JSON 备用",
      ]),
    ],
    answer: "已生成 4 条待办，批准后生效。\n\n（离线 fixture）",
  },
  {
    id: "fx-save-architecture",
    title: "存架构笔记",
    label: "存架构笔记",
    prompt: "把 Aether Desk 架构三句话存成笔记「架构速记」",
    keywords: ["架构速记", "存成笔记"],
    tools: [
      search("Aether Desk 产品原则"),
      note(
        "架构速记",
        "Chat SSE 编排 + SQLite 持久化 + 工具可观测 + 写操作 HITL。无 Key 走 fixture，有 Key 走真模型。",
        "architecture,fixture",
      ),
    ],
    answer: "已提交「架构速记」草稿，请批准写入。\n\n（离线 fixture）",
  },
  {
    id: "fx-diff-export-import",
    title: "导出导入对比",
    label: "导出 vs 导入",
    prompt: "用表格对比会话导出与导入的职责",
    keywords: ["导入", "导出", "对比职责"],
    tools: [
      table("导出 vs 导入", "导出", "导入", [
        { name: "方向", left: "DB → JSON", right: "JSON → DB" },
        { name: "风险", left: "泄露敏感", right: "脏数据覆盖" },
        { name: "HITL", left: "否（读）", right: "建议确认" },
      ]),
    ],
    answer: "对比表已生成。导入前建议先新建会话再回放。\n\n（离线 fixture）",
  },
  {
    id: "fx-multi-search",
    title: "多轮检索",
    label: "多轮检索",
    prompt: "分别检索 HITL 与 RAG，再总结两者关系",
    keywords: ["多轮", "hitl 与 rag", "两者关系"],
    tools: [search("HITL 写操作"), search("RAG 落地")],
    answer:
      "HITL 管写安全 [1]；RAG 管读证据 [2]。Agent 应用两者都要可观测。\n\n（离线 fixture）",
  },
  {
    id: "fx-empty-query-fallback",
    title: "泛问兜底",
    label: "泛问兜底",
    prompt: "你好，这个工作台能做什么？",
    keywords: ["你好", "能做什么", "介绍一下"],
    tools: [search("Aether Desk 产品原则"), search("工作台自测清单")],
    answer:
      "Aether Desk 是个人知识工作台：检索笔记、生成对比表/待办、HITL 写库。可点下方快捷句或「演示剧本」跑通全流程。\n当前为离线 fixture 模式（未配置 Chat API Key）。\n\n（离线 fixture）",
  },
  {
    id: "fx-reindex-coach",
    title: "重建索引指导",
    label: "重建索引",
    prompt: "什么时候需要重建索引？生成检查待办",
    keywords: ["重建索引", "dims", "不一致"],
    tools: [
      search("知识库分块"),
      tasks("索引健康检查", [
        "看健康接口 embedding dims",
        "知识库点重建索引",
        "再跑 /eval Hit@k",
      ]),
    ],
    answer: "dims 变更或种子补全后应重建。待办已生成。\n\n（离线 fixture）",
  },
  {
    id: "fx-eval-prep",
    title: "Eval 准备",
    label: "Eval 准备",
    prompt: "RAG eval 怎么用？检索相关笔记并给待办",
    keywords: ["eval", "hit@k", "评测"],
    tools: [
      search("RAG"),
      tasks("跑通 Eval", [
        "打开 /eval 页",
        "确认 seed 笔记已索引",
        "记录 keyword vs hybrid 差异",
      ]),
    ],
    answer: "Eval 不依赖 Chat Key。待办已列出。\n\n（离线 fixture）",
  },
  {
    id: "fx-table-then-tasks",
    title: "表 + 待办",
    label: "表+待办",
    prompt: "对比 Zustand 与 Context，再生成迁移待办",
    keywords: ["zustand", "context", "迁移"],
    tools: [
      search("前端 Agent 状态机"),
      table("Zustand vs Context", "Zustand", "Context", [
        { name: "样板代码", left: "少", right: "多" },
        { name: "订阅粒度", left: "细", right: "易整树更新" },
      ]),
      tasks("状态方案", ["保持 Desk 用 Zustand", "文档写清 phase 约定"]),
    ],
    answer: "对比表与待办已生成。\n\n（离线 fixture）",
  },
  {
    id: "fx-safety-note",
    title: "安全笔记",
    label: "安全笔记",
    prompt: "总结写操作安全原则并存笔记「安全原则」",
    keywords: ["安全原则", "写操作安全"],
    tools: [
      search("HITL"),
      note(
        "安全原则",
        "默认拒绝自动写库；awaiting_approval；批准链路要幂等；失败标 error 可重试。",
        "safety,hitl",
      ),
    ],
    answer: "「安全原则」草稿已提交，请批准。\n\n（离线 fixture）",
  },
  {
    id: "fx-desk-vs-loom",
    title: "Desk vs Loom",
    label: "Desk vs Loom",
    prompt: "用表格对比 Aether Desk 与 Loom Agent 定位",
    keywords: ["loom", "desk vs", "对比定位"],
    tools: [
      table("Desk vs Loom", "Aether Desk", "Loom Agent", [
        { name: "场景", left: "知识工作台 + RAG", right: "代码工作室工作区 Agent" },
        { name: "HITL", left: "待办/存笔记", right: "写文件/安全命令" },
        { name: "无 Key", left: "Chat fixture", right: "mock 脚本 + sample 区" },
      ]),
    ],
    answer: "对比表已生成，面试可按场景分工讲述。\n\n（离线 fixture）",
  },
  {
    id: "fx-pipeline-story",
    title: "流水线口述",
    label: "流水线口述",
    prompt: "帮我整理一段 1 分钟口述：检索到 HITL 的链路，并存笔记",
    keywords: ["口述", "1 分钟", "链路"],
    tools: [
      search("SSE"),
      search("HITL"),
      note(
        "1 分钟口述稿",
        "用户提问 → SSE → search_notes 出引用 → 需要写则 awaiting_approval → 用户批准 → 落库/索引。全程可观测。",
        "interview,fixture",
      ),
    ],
    answer: "口述稿草稿已生成，请批准写入后背诵。\n\n（离线 fixture）",
  },
  {
    id: "fx-keyword-mode",
    title: "强制关键词检索",
    label: "关键词检索",
    prompt: "只用关键词模式检索 SSE 协议",
    keywords: ["关键词模式", "keyword 模式"],
    tools: [
      {
        name: "search_notes",
        args: { query: "SSE 流式协议", limit: 5, mode: "keyword" },
      },
    ],
    answer: "已用 keyword 模式检索。可与 hybrid 结果对比可解释性。\n\n（离线 fixture）",
  },
  {
    id: "fx-vector-mode",
    title: "向量检索尝试",
    label: "向量检索",
    prompt: "用向量模式搜同义：智能体循环",
    keywords: ["向量模式", "智能体循环", "同义"],
    tools: [
      {
        name: "search_notes",
        args: { query: "智能体循环", limit: 5, mode: "vector" },
      },
    ],
    answer:
      "已走 vector 模式。无远程 Embedding 时为 local-hash，命中可能偏弱——这正是要讲清的工程取舍。\n\n（离线 fixture）",
  },
  {
    id: "fx-triple-hitl",
    title: "双 HITL",
    label: "双 HITL",
    prompt: "生成待办「双 HITL 验收」，并把结论存笔记「双 HITL」",
    keywords: ["双 hitl", "同时待办和笔记"],
    tools: [
      tasks("双 HITL 验收", ["批准待办", "批准笔记", "刷新知识库确认"]),
      note("双 HITL", "同轮可并行多个 awaiting_approval，UI 需可分别处理。", "hitl"),
    ],
    answer: "待办与笔记草稿均已挂起，请分别批准。\n\n（离线 fixture）",
  },
  {
    id: "fx-default",
    title: "默认探索",
    label: "默认探索",
    prompt: "随便看看知识库里有什么",
    keywords: ["随便", "有什么", "看看"],
    tools: [search("Aether Desk"), search("Agent Loop")],
    answer:
      "知识库已有种子笔记，可继续点快捷句覆盖检索/表格/HITL。无 Chat Key 时所有对话走离线 fixture；配置 Key 后自动改走真模型。\n\n（离线 fixture）",
  },
];

export function listChatFixtures(): ChatFixture[] {
  return CHAT_FIXTURES;
}

export function matchChatFixture(userText: string): ChatFixture {
  const q = userText.trim().toLowerCase();
  if (!q) return CHAT_FIXTURES[CHAT_FIXTURES.length - 1]!;

  let best: ChatFixture | null = null;
  let bestScore = 0;
  for (const fx of CHAT_FIXTURES) {
    if (fx.id === "fx-default") continue;
    let score = 0;
    if (fx.prompt.trim().toLowerCase() === q) score += 100;
    if (q.includes(fx.label.toLowerCase())) score += 20;
    for (const kw of fx.keywords) {
      if (q.includes(kw.toLowerCase())) score += 10;
    }
    // 长 prompt 剧本：覆盖主要片段
    const head = fx.prompt.slice(0, 40).toLowerCase();
    if (head.length > 10 && q.includes(head.slice(0, 24))) score += 30;
    if (score > bestScore) {
      bestScore = score;
      best = fx;
    }
  }
  if (best && bestScore >= 10) return best;
  return CHAT_FIXTURES.find((f) => f.id === "fx-default")!;
}
