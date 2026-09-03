# Aether Desk · 接手必读（HANDOFF）

> **其他对话 / 协作者看这一份就能上手。**  
> 更新日：2026-07-27 · 与代码同步的「当前真相」。

---

## 60 秒：这是什么

**Aether Desk** = 本地优先的个人知识工作台 Agent。

用户在四栏 UI 里：提问 → 模型调工具（检索/对比/待办/存笔记/抓网页）→ SSE 推流 → 右侧出引用/表格/待办卡；数据全进 SQLite，刷新可回放。

**不是**：单栏 ChatGPT 克隆、纯前端 Mock。

---

## 5 分钟启动

```bash
cd aether-desk
export PATH="/opt/homebrew/opt/node@20/bin:$PATH"   # Apple Silicon
node -p "process.version + ' ' + process.arch"      # ≥20 + arm64
cp .env.example .env.local                          # 填 DEEPSEEK_API_KEY
npm install
npm run desk                                        # 不要裸 next dev 乱开 3001
```

打开 **http://localhost:3000**（只用 3000）。默认进入 **主页**（品牌 + 目的 + 能力详解 + 回合示意 + CTA）；顶栏可切到 **对话** 或 **设置**。

自检：

```bash
curl -s http://127.0.0.1:3000/api/health | python3 -m json.tool
# ok=true；apiKeyConfigured 可为 false（此时走离线 Fixture）
curl -s http://127.0.0.1:3000/api/fixtures | python3 -m json.tool   # 可选：剧本列表
```

| 症状 | 处理 |
|------|------|
| 缺 Chat Key / HTTP 500 / :3001 | 关掉旧进程 → `npm run desk` |
| better-sqlite3 架构错误 | `npm rebuild better-sqlite3`（须与 Node arch 一致） |
| SWC CERT_HAS_EXPIRED | 换官方 registry + Node 20 arm64 |

详情：[`PROBLEMS-AND-USAGE.md`](./PROBLEMS-AND-USAGE.md)

---

## 界面地图

顶栏 Tab：**主页（默认）** · **对话** · **设置**

主页：品牌先行 · 产品目的 · 四项能力详解 · 回合流程示意 · 推荐用法 CTA（`DeskHome.tsx`）。

```
对话工作台：
┌──────────┬────────────┬────────────┬────────────┐
│ 会话列表  │ 对话 (SSE)  │ 工具时间线  │ 制品/引用   │
│ 置顶改名  │ Markdown   │ 耗时概览    │ 卡/表/待办  │
│ 导出/导入 │ 引用 [n]   │ HITL 批准   │ 点击跳转    │
└──────────┴────────────┴────────────┴────────────┘
```

设置：紧凑布局 / 顶栏副标题 / Fixture 横幅 / 启动落在主页（`desk-prefs.ts`）。

进度 [`PROGRESS.md`](./PROGRESS.md) · 迁移 [`MIGRATE.md`](./MIGRATE.md) · RAG [`RAG.md`](./RAG.md)。

快捷句 / Fixture：混合检索+引用、对比表、待办 HITL、存笔记 HITL、全流程演示（见 `lib/ai/fixtures/catalog.ts`）。

---

## 目录与职责

| 路径 | 职责 |
|------|------|
| `src/app/api/chat` | SSE Agent 回合（核心；无 Key → Fixture runner） |
| `src/app/api/fixtures` | 离线剧本列表 |
| `src/app/api/sessions` | 会话 CRUD / 置顶改名 / 快照 |
| `src/app/api/sessions/import` | 导入导出的 JSON 回放 |
| `src/app/api/notes` | 知识库 + 自动索引 |
| `src/app/api/tools/[id]/approve\|reject` | HITL（`lib/hitl/transitions`） |
| `src/lib/ai/desk-tools.ts` | 工具 `execute` + emit |
| `src/lib/ai/fixtures/*` | 离线 Chat Fixture 目录与 runner |
| `src/lib/ai/model.ts` | DeepSeek/OpenAI 兼容 |
| `src/lib/notes/*` | 分块 / Embedding / Hybrid / RRF |
| `src/lib/desk-prefs.ts` | 布局偏好（localStorage） |
| `src/lib/stores/desk-store.ts` | 客户端状态机 + SSE 解析 + `shellView` |
| `src/components/desk/DeskShell.tsx` | 顶栏 Tab + 主页 / 对话 / 设置 |
| `src/components/desk/DeskHome.tsx` | 产品主页 |
| `src/components/desk/DeskSettings.tsx` | 页面设置 |
| `scripts/dev.mjs` | 一键安全启动 |
| `scripts/run-tests.mjs` | `npm test` |
| `data/aether.db` | 运行时库（gitignore） |

---

## SSE 协议契约（前端必懂）

| event | data 要点 | UI 行为 |
|-------|-----------|---------|
| `session` | `{ sessionId }` | 绑定当前会话 |
| `phase` | `{ phase }` | thinking/tooling… |
| `text-delta` | `{ delta }` | 流式拼字 |
| `tool-run` | ToolRun 对象 | 时间线 upsert |
| `artifact` | Artifact 对象 | 右侧制品 |
| `error` | `{ message }` | 红条错误 |
| `done` | `{ sessionId, text }` | 合入 messages，phase→idle/hitl |

HTTP 非 2xx：JSON `{ error, hint? }`（启动失败时，非 SSE）。

---

## 工具清单与 HITL 真值表

| 工具 | 副作用 | HITL？ | 现状 |
|------|--------|--------|------|
| `search_notes` | 只读 | 否 | Hybrid RAG + citation 制品 |
| `summarize_diff` | 写 artifact | 否 | 表格卡 |
| `create_task_card` | 预写 pending artifact | **是** | 批准改 status；拒绝删制品 |
| `save_note` | 批准后写 notes + 索引 | **是** | 草稿制品 → 批准才落库（2026-07） |
| `fetch_url` | 写摘录制品 | 否 | **禁内网/非 http(s)**，禁跟随重定向 |

诚实表述：待办是「预览落库 + 批准生效」；不是「批准前库里完全没有」。

---

## 数据模型（心智图）

```
sessions (title, pinned)
  ├── messages
  ├── tool_runs (status: pending|running|awaiting_approval|result|error|cancelled)
  └── artifacts (kind: note|table_card|task_card, approval_status)

notes
  └── note_chunks (embedding_json, model, dims)
```

迁移：目前 `CREATE IF NOT EXISTS` + `pinned` 列 `ALTER`；**无正式 drizzle migration 目录**。

---

## 环境变量

| 变量 | 必需 | 说明 |
|------|------|------|
| `DEEPSEEK_API_KEY` 或 `OPENAI_API_KEY` | 是 | 聊天 |
| `AI_BASE_URL` / `AI_MODEL` | 否 | DeepSeek 有默认 |
| `EMBEDDING_*` | 否 | 不配 → `local-hash-v1` |

改 env **必须重启** `npm run desk`。

---

## 推荐验收路径（3 分钟）

1. 知识库确认 ≥10 条种子笔记  
2. 「混合检索 + 引用」→ 时间线有 search → 点 `[1]`  
3. 「生成待办」→ 批准  
4. 会话列表：置顶 / 重命名 / **导出 JSON** / **导入回放**  
5. 「保存一条笔记」→ 批准 → 知识库出现新笔记  
6. `curl /api/health` 看 runtime.arch / warnings

工作流剧本：[`WORKFLOW-SCENARIO.md`](./WORKFLOW-SCENARIO.md)

---

## 已知限制（别当 Bug 乱改）

1. Abort：客户端 Stop 已传 `abortSignal`；极端情况下部分工具仍可能写完半步  
2. 对话历史不回灌 tool message（多轮工具上下文弱）  
3. Embedding 换维度后需「重建索引」，否则向量分恒 0  
4. 检索全表加载，适合个人笔记量  
5. 无多用户鉴权（本地单机假设）  
6. Next 15.1.6 有上游安全提示，升级单独排期  

完整路线图：[`ROADMAP.md`](./ROADMAP.md)

---

## 文档索引

| 文档 | 给谁 |
|------|------|
| **本文件 HANDOFF** | 新对话 / 协作者第一眼 |
| [`RESUME.md`](./RESUME.md) | 写简历 / 面试稿 |
| [`ROADMAP.md`](./ROADMAP.md) | 下一步做什么 |
| [`ARCHITECTURE.md`](./ARCHITECTURE.md) | 选型与分层 |
| [`RAG.md`](./RAG.md) | 检索细节 |
| [`PROBLEMS-AND-USAGE.md`](./PROBLEMS-AND-USAGE.md) | 翻车与用法 |
| [`WORKFLOW-SCENARIO.md`](./WORKFLOW-SCENARIO.md) | 实战演示剧本 |
| [`INTERVIEW.md`](./INTERVIEW.md) | 深挖问答 |

---

## 给 AI 协作者的指令模板

```
项目：aether-desk（个人知识工作台 Agent）
先读：docs/HANDOFF.md + docs/ROADMAP.md
约束：Node ≥20 arm64；npm run desk；不要提交 .env.local
当前主路径：/api/chat + desk-tools，不是 mock-agent
改工具时同步：catalog.ts + types + HITL 真值表（HANDOFF）
```
