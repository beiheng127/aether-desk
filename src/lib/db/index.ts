import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import * as schema from "@/lib/db/schema";
import { seedIfEmpty } from "@/lib/db/seed";
import { formatRuntimeError } from "@/lib/errors";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "aether.db");

declare global {
  var __aetherDb:
    | ReturnType<typeof drizzle<typeof schema>>
    | undefined;
  var __aetherSqlite: Database.Database | undefined;
}

function createSchema(sqlite: Database.Database) {
  sqlite.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL DEFAULT '未命名会话',
      pinned INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tool_runs (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      display_name TEXT NOT NULL,
      status TEXT NOT NULL,
      args_json TEXT,
      result_preview TEXT,
      error_message TEXT,
      requires_approval INTEGER NOT NULL DEFAULT 0,
      started_at INTEGER NOT NULL,
      ended_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS artifacts (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
      kind TEXT NOT NULL,
      title TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      source_tool_run_id TEXT,
      approval_status TEXT NOT NULL DEFAULT 'none',
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      tags TEXT NOT NULL DEFAULT '',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS note_chunks (
      id TEXT PRIMARY KEY,
      note_id TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
      chunk_index INTEGER NOT NULL,
      content TEXT NOT NULL,
      embedding_json TEXT NOT NULL,
      embedding_model TEXT NOT NULL,
      dims INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_tool_runs_session ON tool_runs(session_id, started_at);
    CREATE INDEX IF NOT EXISTS idx_artifacts_session ON artifacts(session_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_notes_updated ON notes(updated_at);
    CREATE INDEX IF NOT EXISTS idx_note_chunks_note ON note_chunks(note_id);
  `);

  migrateSessions(sqlite);
}

function migrateSessions(sqlite: Database.Database) {
  const cols = sqlite.pragma("table_info(sessions)") as Array<{ name: string }>;
  if (!cols.some((c) => c.name === "pinned")) {
    sqlite.exec(
      `ALTER TABLE sessions ADD COLUMN pinned INTEGER NOT NULL DEFAULT 0`,
    );
  }
}

function getSqlite() {
  if (!global.__aetherSqlite) {
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
      const sqlite = new Database(DB_PATH);
      createSchema(sqlite);
      global.__aetherSqlite = sqlite;
    } catch (err) {
      throw new Error(formatRuntimeError(err));
    }
  }
  return global.__aetherSqlite;
}

export function getDb() {
  if (!global.__aetherDb) {
    const sqlite = getSqlite();
    global.__aetherDb = drizzle(sqlite, { schema });
    seedIfEmpty(global.__aetherDb);
  }
  return global.__aetherDb;
}

export type AppDb = ReturnType<typeof getDb>;
