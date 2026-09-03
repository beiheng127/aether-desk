# Aether Desk · 面试问答提纲

## 30 秒介绍

> Aether Desk 是我做的个人知识工作台 Agent。默认先进主页讲清定位，对话页是四栏：流式回复、工具时间线、制品面板。后端用 Next.js + SQLite 持久化会话、工具运行、制品和笔记；Vercel AI SDK 做多步 Tool Calling。知识库是 Hybrid RAG（关键词 + 向量 + RRF），回答带可点击引用。待办与存笔记有 HITL。无 Key 时用 Fixture 仍走真实工具路径。这不是调包聊天 Demo，而是能存、能搜、能确认、能导出回放的可用工具。

完整简历稿见 [`RESUME.md`](./RESUME.md)。

## 深挖准备

### 为什么 SQLite 而不是一上来 Postgres？

本地零成本、作品可克隆即用；schema 用 Drizzle 抽象，迁云端成本可控。校招作品优先「完整闭环」，不是堆 infra。

### Mock 还在吗？

产品路径始终是 `/api/chat`。未配置有效 Chat Key 时走 **Fixture runner**：按剧本调用真实 `desk-tools` 落库（可演示 HITL / 引用），不是前端假打字机。配好 Key 后只走真模型，不再走 Fixture。

### 检索为什么用 Hybrid + SQLite 向量？

专有词靠关键词，同义改写靠向量；个人规模没必要先上 Qdrant。向量落 SQLite，模型优先 text-embedding-3-small/bge-m3，没有 Embedding Key 用 local-hash 兜底。规模上来再迁 pgvector。

### 流式与工具事件如何同步？

工具 `execute` 内 `emit` → 队列；`fullStream` 循环里 `flushEmits`，保证 tool-run/artifact 与 text-delta 同一 SSE 通道到达前端。

### HITL 在数据库里发生了什么？

- `create_task_card`：先写入 `awaiting_approval` 的 tool_run 与 `pending` 制品；批准改 status，拒绝删制品。  
- `save_note`：**批准前不写 `notes` 表**；批准时才 insert + `indexNote`，并更新制品正文。  
- 详见 `HANDOFF.md` 真值表与 `ROADMAP.md`。

并列作品 **Loom Agent**（`../agent`）：编码 Agent + Plan Board，见该仓 `docs/RESUME.md`。

### 和「调 API 的聊天页」差在哪？

实体拆分（消息/工具/制品/笔记）、服务端编排、可观测时间线、引用闭环、本地持久化回放。详见 `RESUME.md` 对比表。
