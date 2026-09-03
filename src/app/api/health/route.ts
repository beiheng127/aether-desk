import { listChatFixtures } from "@/lib/ai/fixtures/catalog";
import { hasApiKey, useMockChat } from "@/lib/ai/model";
import { getDb } from "@/lib/db";
import { notes, sessions } from "@/lib/db/schema";
import { ensureSeedNotes } from "@/lib/db/seed";
import { formatRuntimeError } from "@/lib/errors";
import { getEmbeddingInfo } from "@/lib/notes/embed";
import { getIndexStats, reindexAllNotes } from "@/lib/notes/indexer";
import { getRagConfig } from "@/lib/notes/rag-config";
import { count } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = getDb();
    const seed = ensureSeedNotes(db);
    if (seed.inserted > 0) {
      await reindexAllNotes();
    }

    const [{ noteCount }] = db.select({ noteCount: count() }).from(notes).all();
    const [{ sessionCount }] = db
      .select({ sessionCount: count() })
      .from(sessions)
      .all();

    let index = getIndexStats();
    if (index.noteCount > 0 && index.chunkCount === 0) {
      await reindexAllNotes();
      index = getIndexStats();
    }

    const embedding = getEmbeddingInfo();
    const embeddingMismatch =
      index.dims != null &&
      embedding.dims != null &&
      index.dims !== embedding.dims;

    const mockMode = useMockChat();

    return Response.json({
      ok: true,
      apiKeyConfigured: hasApiKey(),
      mockMode,
      fixtureCount: listChatFixtures().length,
      noteCount,
      sessionCount,
      index,
      embedding,
      rag: getRagConfig(),
      warnings: [
        ...(embeddingMismatch
          ? [
              `索引 dims=${index.dims} 与当前 embedding dims=${embedding.dims} 不一致，向量检索可能失效。请在知识库点「重建索引」。`,
            ]
          : []),
        ...(mockMode
          ? [
              "未配置可用 Chat API Key：对话走离线 fixture（真实工具落库）。配置 Key 后自动切换真模型，不再调用 mock。",
            ]
          : []),
      ],
      db: "sqlite:data/aether.db",
      runtime: {
        node: process.version,
        arch: process.arch,
        portHint: "请使用 http://localhost:3000（npm run desk）",
      },
    });
  } catch (err) {
    return Response.json(
      {
        ok: false,
        apiKeyConfigured: hasApiKey(),
        mockMode: useMockChat(),
        error: formatRuntimeError(err),
        code: "HEALTH_FAILED",
        runtime: {
          node: process.version,
          arch: process.arch,
        },
        hint: "常见原因：用了 Rosetta/x64 Node，或打开了旧的 :3001 进程。执行 npm run desk。",
      },
      { status: 500 },
    );
  }
}
