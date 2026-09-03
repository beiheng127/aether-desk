# Aether Desk · 数据库与迁移

> 当前库：`data/aether.db`（SQLite + better-sqlite3 + Drizzle）

## 现状（真相）

本仓库**不依赖**每次手动跑 `drizzle-kit migrate`。  
启动时 `src/lib/db/index.ts` 会：

1. `CREATE TABLE IF NOT EXISTS …` 建全量表  
2. `migrateSessions()` 等轻量 `ALTER TABLE`（例：为 `sessions` 补 `pinned`）  
3. 空库时 seed 笔记  

适合单机作品与演示；加列时优先在 `createSchema` / `migrateXxx` 里写幂等 SQL。

## 推荐加列流程

1. 改 `src/lib/db/schema.ts`（Drizzle 类型源）  
2. 在 `createSchema` 的 `CREATE TABLE` 中补新列（**仅影响新库**）  
3. 在 `migrateXxx(sqlite)` 用 `PRAGMA table_info` 检测，缺则：

```sql
ALTER TABLE <table> ADD COLUMN <col> <type> [DEFAULT …];
```

4. 本地验证：

```bash
npm run desk
# 或备份后删库重来
cp data/aether.db data/aether.db.bak
rm data/aether.db
npm run desk
```

5. 在本文「迁移日志」记一笔  

## 可选：drizzle-kit 生成 SQL（不强制）

已提供 `drizzle.config.ts`。需要官方 SQL 草案时：

```bash
npx drizzle-kit generate
# 产出在 drizzle/ （可参考，再手工并入 migrateXxx）
```

不要在未审阅的情况下对生产库盲跑 `drizzle-kit push`。

## 迁移日志

| 日期 | 变更 | 实现位置 |
|------|------|----------|
| 早期 | 初始 sessions/messages/tool_runs/artifacts/notes/note_chunks | `createSchema` |
| 2026-07 | `sessions.pinned` | `migrateSessions` |

## 向量后端切换（文档优先）

个人规模：SQLite 存 `embedding_json` + 内存余弦即可。  
上万 chunk / 多租户时再迁 **pgvector / Turso**：

1. 保持 `notes` / `note_chunks` 逻辑字段不变  
2. 换 `getDb()` 驱动与向量查询实现  
3. 保留 Hybrid + RRF 接口（`searchNotes`）  

详见 `docs/RAG.md`。
