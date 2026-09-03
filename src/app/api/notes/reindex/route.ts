import { reindexAllNotes, getIndexStats } from "@/lib/notes/indexer";
import { getEmbeddingInfo } from "@/lib/notes/embed";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const result = await reindexAllNotes();
  const stats = getIndexStats();
  return Response.json({
    ok: true,
    ...result,
    stats,
    embedding: getEmbeddingInfo(),
  });
}

export async function GET() {
  return Response.json({
    stats: getIndexStats(),
    embedding: getEmbeddingInfo(),
  });
}
