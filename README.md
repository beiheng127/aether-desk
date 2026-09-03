# Aether Desk

个人知识工作台 Agent（全栈）：会话持久化、真 Tool Calling、**混合 RAG（关键词+向量）**、引用角标、HITL 待办、Generative UI。

不是聊天 Demo —— 目标是 **可以每天用来管笔记和任务的工具**。

## 环境要求

- **Node.js ≥ 20.18**（推荐 20 LTS，**arm64 原生**）。Next.js 15 在 Node 18 / Rosetta x64 上容易踩 SWC / `better-sqlite3` 架构问题。
- Apple Silicon 优先：`export PATH="/opt/homebrew/opt/node@20/bin:$PATH"`，确认 `node -p process.arch` 输出 `arm64`。
- **一键启动请用 `npm run desk`**（会清掉冲突的 3000/3001、校验 Key、必要时 rebuild）。详见 [问题总结与使用流程](./docs/PROBLEMS-AND-USAGE.md)。

## 快速开始

```bash
cd aether-desk
cp .env.example .env.local
# 编辑 .env.local，填入 DEEPSEEK_API_KEY（推荐）或 OPENAI_API_KEY

npm install
npm run desk
```

浏览器打开 **http://localhost:3000**（不要用自动跳出来的旧 :3001）。

默认进入 **主页**：品牌先行的产品介绍（目的、能力、回合流程、推荐用法）；顶栏 Tab 可切换 **对话** 与 **设置**。  
未配置有效 Chat Key 时，对话走 **离线 Fixture**（真实工具落库，可演示 HITL/引用）；配置 Key 后只走真模型。

若报 `Failed to load SWC` / `better-sqlite3` 架构不兼容 / 页面显示「缺 Chat Key」但其实配过 Key：

```bash
node -p process.arch   # M 系列应为 arm64
npm rebuild better-sqlite3
npm run desk
```

完整故障对照与验收路径见：[docs/PROBLEMS-AND-USAGE.md](./docs/PROBLEMS-AND-USAGE.md)。

打开 http://localhost:3000

1. 点「知识库」增删笔记（自动分块索引）；可点「重建索引」  
2. 配置 Chat Key 后发送：「用混合检索查 Agent Loop，并引用编号回答要点」  
3. 回答里的 `[1]` 可点击，右侧跳到引用卡  
4. 可选配置 `EMBEDDING_API_KEY` 使用远程向量（见 `docs/RAG.md`）

## 技术栈

| 层 | 技术 |
|----|------|
| 前端 | Next.js 15 · React 19 · Zustand · Tailwind |
| Agent | Vercel AI SDK `streamText` + tools |
| 模型 | DeepSeek / OpenAI 兼容网关 |
| 数据 | Drizzle ORM + better-sqlite3 |
| 协议 | 自定义 SSE（text-delta / tool-run / artifact） |

## 文档

| 文档 | 用途 |
|------|------|
| **[接手必读 HANDOFF](./docs/HANDOFF.md)** | 其他对话 / 协作者第一眼上手 |
| **[进度 PROGRESS](./docs/PROGRESS.md)** | 完成度与下一步计划表 |
| **[数据库迁移 MIGRATE](./docs/MIGRATE.md)** | 加列流程与 drizzle-kit 可选用法 |
| [简历项目介绍](./docs/RESUME.md) | 简历条目 + 面试稿 + 特异点 |
| [路线图 ROADMAP](./docs/ROADMAP.md) | 下一阶段目标与 P0/P1/P2 |
| [架构与选型](./docs/ARCHITECTURE.md) | 分层与选型 |
| [RAG 选型说明](./docs/RAG.md) | 检索细节 |
| [问题总结与使用流程](./docs/PROBLEMS-AND-USAGE.md) | 翻车对照 |
| [实战工作流](./docs/WORKFLOW-SCENARIO.md) | 会话导出演示剧本 |
| [面试提纲](./docs/INTERVIEW.md) | 深挖问答 |

## 脚本

| 命令 | 作用 |
|------|------|
| `npm run desk` / `npm run dev` | 一键安全启动（推荐） |
| `npm run test` | 单元测试（RRF / HITL / citation） |
| `npm run db:generate` | 可选：drizzle-kit 生成 SQL 草案 |
| `npm run dev:raw` | 原始 `next dev`（不推荐） |
| `npm run build` | 生产构建 |
| `npm run lint` | ESLint |
