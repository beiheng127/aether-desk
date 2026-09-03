import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

/** 会话：一次可恢复的 Agent 工作线程 */
export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  title: text("title").notNull().default("未命名会话"),
  pinned: integer("pinned", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "number" }).notNull(),
  updatedAt: integer("updated_at", { mode: "number" }).notNull(),
});

export const messages = sqliteTable("messages", {
  id: text("id").primaryKey(),
  sessionId: text("session_id")
    .notNull()
    .references(() => sessions.id, { onDelete: "cascade" }),
  role: text("role", { enum: ["user", "assistant", "system"] }).notNull(),
  content: text("content").notNull(),
  createdAt: integer("created_at", { mode: "number" }).notNull(),
});

export const toolRuns = sqliteTable("tool_runs", {
  id: text("id").primaryKey(),
  sessionId: text("session_id")
    .notNull()
    .references(() => sessions.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  displayName: text("display_name").notNull(),
  status: text("status").notNull(),
  argsJson: text("args_json"),
  resultPreview: text("result_preview"),
  errorMessage: text("error_message"),
  requiresApproval: integer("requires_approval", { mode: "boolean" })
    .notNull()
    .default(false),
  startedAt: integer("started_at", { mode: "number" }).notNull(),
  endedAt: integer("ended_at", { mode: "number" }),
});

export const artifacts = sqliteTable("artifacts", {
  id: text("id").primaryKey(),
  sessionId: text("session_id")
    .notNull()
    .references(() => sessions.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(),
  title: text("title").notNull(),
  payloadJson: text("payload_json").notNull(),
  sourceToolRunId: text("source_tool_run_id"),
  /** pending | approved | rejected | none */
  approvalStatus: text("approval_status").notNull().default("none"),
  createdAt: integer("created_at", { mode: "number" }).notNull(),
});

/** 个人知识库笔记 —— Agent 可检索的长期记忆 */
export const notes = sqliteTable("notes", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  tags: text("tags").notNull().default(""),
  createdAt: integer("created_at", { mode: "number" }).notNull(),
  updatedAt: integer("updated_at", { mode: "number" }).notNull(),
});

/**
 * 笔记分块 + 向量
 * 个人知识库规模下用 SQLite 存 float[] JSON + 内存余弦即可；
 * 上万 chunk / 多租户时再迁 pgvector / Qdrant。
 */
export const noteChunks = sqliteTable("note_chunks", {
  id: text("id").primaryKey(),
  noteId: text("note_id")
    .notNull()
    .references(() => notes.id, { onDelete: "cascade" }),
  chunkIndex: integer("chunk_index").notNull(),
  content: text("content").notNull(),
  embeddingJson: text("embedding_json").notNull(),
  embeddingModel: text("embedding_model").notNull(),
  dims: integer("dims").notNull(),
  createdAt: integer("created_at", { mode: "number" }).notNull(),
});
