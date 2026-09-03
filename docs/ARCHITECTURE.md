# Aether Desk · Architecture

> 面试开场 + 选型证据。本文件描述的是 **全栈可用工具**，不是前端壳 Demo。  
> 更新：2026-07-27

## 产品定位

**个人知识工作台 Agent**：把「笔记知识库 + 多轮会话 + 工具执行可观测 + 可确认任务」做成可每天用的本地工具。

顶栏：**主页（默认）** / **对话** / **设置**。对话页四栏：

| 面板 | 职责 | 持久化 |
|------|------|--------|
| 会话列表 | 恢复 / 置顶 / 重命名 / 导出 JSON | `sessions` / `messages` |
| 对话 | SSE 流式回复 + Markdown + 引用 `[n]` | 服务端落库 |
| 工具时间线 | Function Calling 状态机 + 耗时概览 | `tool_runs` |
| 制品 | Generative UI（待办 / 表 / 引用） | `artifacts`（含 HITL） |
| 知识库 | 笔记 CRUD + 检索（侧栏入口） | `notes` / `note_chunks` |

接手请先读 [`HANDOFF.md`](./HANDOFF.md)；进度 [`PROGRESS.md`](./PROGRESS.md)；下一阶段见 [`ROADMAP.md`](./ROADMAP.md)。

## 分层

```
UI (DeskShell: home | chat | settings)
  ↔ Zustand（shellView + SSE 状态机）
    ↔ REST / SSE
      ↔ Next.js Route Handlers (nodejs runtime)
        ↔ 有 Key：Vercel AI SDK streamText + tools
        ↔ 无 Key：fixtures/runner（仍调用真实 desk-tools 落库）
        ↔ Drizzle + better-sqlite3 (data/aether.db)
```

## 为什么这样选

### SQLite + Drizzle（本地优先）

- 零运维，克隆就能用，符合「值得自用的工具」
- 会话/工具/制品/笔记全部可回放，面试能展示数据模型
- 升级路径：同一 schema 迁 Postgres / Turso；流程见 [`MIGRATE.md`](./MIGRATE.md)

### 服务端 Tool Calling，而不是前端 Mock 意图识别

- 模型决定调哪个工具；工具 `execute` 里读写数据库
- 前端只消费 SSE：`text-delta` / `tool-run` / `artifact` / `done`
- 面试点：**编排在服务端，可观测在前端**
- 无 Key 时 Fixture 仍走同一工具路径，避免「假 UI、真空壳」

### 混合检索（关键词 + 向量）

- 关键词：标题加权 + 中英 token / 2-gram（可解释）
- 向量：笔记分块 → Embedding → SQLite `note_chunks` → 余弦相似度
- 融合：RRF；默认 `hybrid`；TopK / 权重可用 `AETHER_RAG_*` 调
- Embedding：远程 `text-embedding-3-small` / `bge-m3`，否则 `local-hash` 兜底
- 详见 [`RAG.md`](./RAG.md)

### HITL 加在写操作

| 工具 | 批准前 | 批准后 |
|------|--------|--------|
| `create_task_card` | `awaiting_approval` + artifact `pending` | status 生效；拒绝删制品 |
| `save_note` | **不写 `notes`**，仅草稿制品 | insert + `indexNote` |

体现 Agent 安全观：写库必须人确认。

## API 一览

| Method | Path | 作用 |
|--------|------|------|
| GET | `/api/health` | Key / 笔记数 / 会话数 / `rag` / fixtures 摘要 |
| GET | `/api/fixtures` | 离线剧本列表 |
| GET/POST | `/api/sessions` | 列表 / 新建 |
| GET/DELETE | `/api/sessions/:id` | 会话快照（含消息工具制品）|
| POST | `/api/sessions/import` | JSON 导入回放 |
| POST | `/api/chat` | SSE Agent 回合 |
| GET/POST/PATCH/DELETE | `/api/notes` | 知识库（写时自动索引） |
| GET/POST | `/api/notes/reindex` | 索引状态 / 全量重建 |
| POST | `/api/tools/:id/approve\|reject` | HITL |
| PATCH | `/api/artifacts/:id` | 任务勾选持久化 |
| GET | `/api/eval` 等 | 评测页相关（见代码） |

## 工具清单

1. `search_notes` — Hybrid 检索 + citation 制品  
2. `summarize_diff` — 对比表制品  
3. `create_task_card` — 待办卡片（HITL）  
4. `save_note` — 写入知识库（HITL，批准后落库）  
5. `fetch_url` — HTTP 抓取（禁内网 / 禁重定向）  

## 配置与脚本

```bash
cp .env.example .env.local   # DEEPSEEK_API_KEY；可选 EMBEDDING_* / AETHER_RAG_*
npm run desk                 # 推荐
npm test                     # RRF / citation / HITL
```

数据库文件：`data/aether.db`（gitignore）。

## 相对演进

| 阶段 | 能力 |
|------|------|
| UI 骨架 | 多栏 + HITL 状态机 |
| 全栈 | SQLite + SSE tools + 知识库 CRUD |
| RAG | 分块 / Embedding / Hybrid / 引用角标 |
| 产品壳 | 主页 Tab / 设置偏好 / Fixture / 单测 / 可调 RAG |
