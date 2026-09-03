import { getDb } from "@/lib/db";
import { ensureSeedNotes } from "@/lib/db/seed";
import { formatRuntimeError } from "@/lib/errors";
import { reindexAllNotes, getIndexStats } from "@/lib/notes/indexer";
import { searchNotes, type NoteHit } from "@/lib/notes/search";
import { readFile } from "fs/promises";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type EvalQuery = {
  id: string;
  query: string;
  expectNoteTitleIncludes: string[];
};

type HitAt = { 1: boolean; 3: boolean; 5: boolean };

type ModeSummary = {
  "hit@1": number;
  "hit@3": number;
  "hit@5": number;
};

function matchesExpect(title: string, needles: string[]) {
  return needles.some((n) => title.includes(n));
}

function computeHitAt(hits: NoteHit[], expect: string[]): HitAt {
  const ranks = [1, 3, 5] as const;
  const result = { 1: false, 3: false, 5: false };
  for (const k of ranks) {
    const top = hits.slice(0, k);
    result[k] = top.some((h) => matchesExpect(h.title, expect));
  }
  return result;
}

function averageHitAt(rows: HitAt[]): ModeSummary {
  const n = rows.length || 1;
  const sum = { 1: 0, 3: 0, 5: 0 };
  for (const row of rows) {
    if (row[1]) sum[1] += 1;
    if (row[3]) sum[3] += 1;
    if (row[5]) sum[5] += 1;
  }
  return {
    "hit@1": Number((sum[1] / n).toFixed(3)),
    "hit@3": Number((sum[3] / n).toFixed(3)),
    "hit@5": Number((sum[5] / n).toFixed(3)),
  };
}

async function loadEvalQueries(): Promise<EvalQuery[]> {
  const filePath = path.join(process.cwd(), "data", "eval-queries.json");
  const raw = await readFile(filePath, "utf8");
  const parsed = JSON.parse(raw) as EvalQuery[];
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error("eval-queries.json 为空或格式无效");
  }
  return parsed;
}

export async function GET() {
  try {
    const db = getDb();
    const seed = ensureSeedNotes(db);
    let index = getIndexStats();
    if (seed.inserted > 0 || (index.noteCount > 0 && index.chunkCount === 0)) {
      await reindexAllNotes();
      index = getIndexStats();
    }

    const queries = await loadEvalQueries();
    const keywordHitAts: HitAt[] = [];
    const hybridHitAts: HitAt[] = [];

    const results = [];
    for (const q of queries) {
      const [keywordHits, hybridHits] = await Promise.all([
        searchNotes(q.query, 5, "keyword"),
        searchNotes(q.query, 5, "hybrid"),
      ]);

      const keywordHitAt = computeHitAt(keywordHits, q.expectNoteTitleIncludes);
      const hybridHitAt = computeHitAt(hybridHits, q.expectNoteTitleIncludes);
      keywordHitAts.push(keywordHitAt);
      hybridHitAts.push(hybridHitAt);

      results.push({
        id: q.id,
        query: q.query,
        expectNoteTitleIncludes: q.expectNoteTitleIncludes,
        keywordHitAt,
        hybridHitAt,
        keywordHits: keywordHits.map((h) => ({
          title: h.title,
          score: h.score,
          mode: h.mode,
        })),
        hybridHits: hybridHits.map((h) => ({
          title: h.title,
          score: h.score,
          mode: h.mode,
          keywordScore: h.keywordScore,
          vectorScore: h.vectorScore,
        })),
      });
    }

    return Response.json({
      results,
      summary: {
        keyword: averageHitAt(keywordHitAts),
        hybrid: averageHitAt(hybridHitAts),
        queryCount: queries.length,
      },
      index,
    });
  } catch (err) {
    return Response.json(
      {
        error: formatRuntimeError(err),
        code: "RAG_EVAL_FAILED",
      },
      { status: 500 },
    );
  }
}
