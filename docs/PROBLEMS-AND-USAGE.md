# Aether Desk · 问题总结、修复说明与使用流程

> 对应截图现象：顶栏「缺 Chat Key」、对话区 **HTTP 500**、请求打到 `localhost:3001/api/chat`。

---

## 1. 截图问题总结

| 现象 | 真实原因 | 说明 |
|------|----------|------|
| 顶栏红标「缺 Chat Key」 | 健康检查 `/api/health` 失败（多为 **500**），前端把失败当成「没 Key」 | `.env.local` 里其实可能已有 Key；是 **后端起不来**，不是没配 |
| 对话报 **HTTP 500** | `better-sqlite3` 与当前 Node **架构不匹配**（arm64 模块 + x64/Rosetta Node），或卡在坏掉的旧进程 | `POST /api/chat` 一碰数据库就崩 |
| 地址是 **:3001** | 3000 被占用后，另一次 `next dev` 自动换到 3001 | 3001 常是 **未加载 .env / 错误 Node** 的僵尸实例 |
| Embed 显示 `local-hash` | 未配远程 `EMBEDDING_*` | **正常兜底**，不是故障；聊天不依赖远程向量 |
| 工具栏 / 制品区为空 | 聊天从未成功跑完 | 修好启动后，检索/待办会自动出现 |

一句话：**不是「没配 DeepSeek」这么简单，而是「开错了端口 + Node 架构不对」导致全链路 500，UI 误报缺 Key。**

---

## 2. 本次改动清单

### 启动与环境

- 新增 `scripts/dev.mjs`，`npm run desk` / `npm run dev` 都会走它：
  - 优先使用 Homebrew **arm64** `node@20`
  - 检查 `.env.local` 是否含有效 API Key
  - 检测并 **rebuild** 架构不匹配的 `better-sqlite3`
  - **清理 3000 / 3001** 旧进程，固定在 **3000** 启动
- `package.json`：`dev` → 安全启动；保留 `dev:raw` = 原始 `next dev`

### 后端健壮性

- `src/lib/errors.ts`：把 `ERR_DLOPEN_FAILED` 等翻译成可执行修复步骤
- `getDb()` / `/api/health` / `/api/chat`：统一捕获并返回可读 `error` + `hint`
- health 增加 `runtime.node` / `runtime.arch`，方便自查

### 前端体验

- bootstrap：区分「真缺 Key」与「健康检查 500」
- 顶栏新增 **运行异常** 红条（架构/端口问题）
- 聊天失败时展示服务端 `error` + `hint`，不再只显示冰冷的 `HTTP 500`
- 无 Key 时禁止发送，避免无意义请求

### 文档

- 本文件：`docs/PROBLEMS-AND-USAGE.md`
- `README.md` 指向一键启动与本文

---

## 3. 修改后的功能一览

| 模块 | 能力 |
|------|------|
| 会话 | 多会话、SSE 流式、刷新回放、删除会话 |
| Agent | DeepSeek/OpenAI 兼容；`streamText` + 多步 Tool Calling |
| 工具 | `search_notes` / `create_task_card`(HITL) / `summarize_diff` / `save_note` / `fetch_url` |
| 知识库 | 笔记 CRUD、分块索引、混合检索（关键词 + 向量）、引用角标 `[n]` |
| 制品 | 引用卡、对比表、待办勾选（落库） |
| 可观测 | 工具时间线：参数、状态、耗时、批准/拒绝 |

---

## 4. 正确启动（请照做）

```bash
cd /Users/xiniuyiliao/Desktop/test/aether-desk

# 推荐：一键安全启动（会清 3000/3001、校验 Key、必要时 rebuild）
npm run desk
```

浏览器只打开：

**http://localhost:3000**

自检：

```bash
curl -s http://127.0.0.1:3000/api/health | python3 -m json.tool
# 期望：ok=true，apiKeyConfigured=true
```

若仍异常：

```bash
export PATH="/opt/homebrew/opt/node@20/bin:$PATH"
node -p "process.version + ' ' + process.arch"   # 应为 v20.x.x arm64
npm rebuild better-sqlite3
npm run desk
```

---

## 5. 使用流程（验收路径）

1. **看顶栏**  
   - `Chat Ready` = 可聊  
   - `Embed · local-hash-v1` = 本地向量兜底（可接受）  
   - 若出现红条「运行异常」→ 按条文执行 `npm run desk`，关掉 :3001

2. **知识库（右上角）**  
   - 已有种子笔记（Agent Loop / RAG / SSR 等）  
   - 可新增笔记 → 自动分块索引；可「重建索引」

3. **快捷句试跑**  
   - 「混合检索 + 引用」→ 中间出现 `search_notes`，右侧引用卡，正文可点 `[1]`  
   - 「生成待办（HITL）」→ 工具状态「待确认」→ 点 **批准**  
   - 「总结并存笔记」→ 调用 `save_note`，知识库多一条  
   - 「对比表制品」→ 右侧表格卡

4. **日常用法**  
   - 先往知识库塞你的笔记/面试题 → 再让 Agent 检索回答并带引用  
   - 需要落地行动时让它生成待办，**必须人工批准**  
   - 左侧会话可回放历史；不需要的会话可删

---

## 6. 配置说明

| 变量 | 必需 | 作用 |
|------|------|------|
| `DEEPSEEK_API_KEY` 或 `OPENAI_API_KEY` | 是 | 聊天模型 |
| `AI_BASE_URL` / `AI_MODEL` | 否 | 默认 DeepSeek |
| `EMBEDDING_API_KEY` 等 | 否 | 远程向量；不配则 `local-hash` |

文件：`.env.local`（已 gitignore）。改 Key 后必须 **重启** `npm run desk`。

---

## 7. 故障速查

| 症状 | 处理 |
|------|------|
| 页面在 `:3001` | 关掉该标签；`npm run desk`；只用 `:3000` |
| `HTTP 500` + 缺 Key | 看顶栏红条；几乎都是 SQLite/架构；rebuild + desk |
| `Chat Ready` 但仍失败 | 查 DeepSeek Key 是否有效/额度；看终端里模型 API 报错 |
| 检索质量一般 | 配远程 Embedding（见 `.env.example`）后再「重建索引」 |

---

## 8. 与秋招作品的关系

修好后，演示顺序建议：

1. 打开工作台 → 指四栏职责  
2. 跑「混合检索 + 引用」→ 讲 Hybrid + Citation  
3. 跑 HITL 待办 → 讲生产级写操作安全  
4. 打开 `docs/ARCHITECTURE.md` / `docs/RAG.md` 讲选型  

本文件记录的是 **从翻车截图到可演示闭环** 的修复与用法，可直接放进作品 README 附录。
