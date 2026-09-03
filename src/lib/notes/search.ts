import { getDb } from "@/lib/db";
import { noteChunks, notes } from "@/lib/db/schema";
import { cosineSimilarity, embedQuery, getEmbeddingInfo } from "@/lib/notes/embed";
import { getRagConfig } from "@/lib/notes/rag-config";
import { rrfFusion, tokenize } from "@/lib/notes/rrf";
import { desc } from "drizzle-orm";

export type RetrievalMode = "keyword" | "vector" | "hybrid";

export interface NoteHit {
  noteId: string;
  title: string;
  snippet: string;
  score: number;
  tags: string;
  chunkId?: string;
  mode: RetrievalMode;
  keywordScore?: number;
  vectorScore?: number;
  citationIndex?: number;
}

/**
 * 混合检索：关键词（可解释）+ 向量（语义）→ RRF 融合。
 * TopK / RRF 权重见 AETHER_RAG_* 环境变量。
 */
export async function searchNotes(
  query: string,
  limit?: number,
  mode: RetrievalMode = "hybrid",
): Promise<NoteHit[]> {
  const cfg = getRagConfig();
  const topK = limit ?? cfg.defaultTopK;

  if (mode === "keyword") {
    return keywordSearch(query, topK).map((h, i) => ({
      ...h,
      mode: "keyword" as const,
      citationIndex: i + 1,
    }));
  }

  if (mode === "vector") {
    const hits = await vectorSearch(query, topK);
    return hits.map((h, i) => ({ ...h, citationIndex: i + 1 }));
  }

  const pool = Math.max(topK * 3, 8);
  const [kw, vec] = await Promise.all([
    Promise.resolve(keywordSearch(query, pool)),
    vectorSearch(query, pool),
  ]);

  const fused = rrfFusion(kw, vec, topK, {
    k: cfg.rrfK,
    keywordWeight: cfg.keywordWeight,
    vectorWeight: cfg.vectorWeight,
  });
  return fused.map((h, i) => ({
    noteId: h.noteId,
    title: h.title ?? "",
    snippet: h.snippet ?? "",
    tags: h.tags ?? "",
    chunkId: h.chunkId,
    score: h.score,
    keywordScore: h.keywordScore,
    vectorScore: h.vectorScore,
    mode: "hybrid" as const,
    citationIndex: i + 1,
  }));
}

function keywordSearch(query: string, limit: number): NoteHit[] {
  const db = getDb();
  const all = db.select().from(notes).orderBy(desc(notes.updatedAt)).all();
  const tokens = tokenize(query);
  if (tokens.length === 0) {
    return all.slice(0, limit).map((n) => ({
      noteId: n.id,
      title: n.title,
      snippet: n.content.slice(0, 160),
      score: 0,
      tags: n.tags,
      mode: "keyword" as const,
      keywordScore: 0,
    }));
  }

  const scored = all
    .map((n) => {
      const hay = `${n.title}\n${n.tags}\n${n.content}`.toLowerCase();
      let score = 0;
      for (const t of tokens) {
        if (n.title.toLowerCase().includes(t)) score += 4;
        if (n.tags.toLowerCase().includes(t)) score += 2;
        score += countOccurrences(hay, t);
      }
      return { note: n, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return scored.map(({ note, score }) => ({
    noteId: note.id,
    title: note.title,
    snippet: makeSnippet(note.content, tokens),
    score,
    tags: note.tags,
    mode: "keyword" as const,
    keywordScore: score,
  }));
}

async function vectorSearch(query: string, limit: number): Promise<NoteHit[]> {
  const db = getDb();
  const chunks = db.select().from(noteChunks).all();
  if (chunks.length === 0) {
    return keywordSearch(query, limit).map((h) => ({
      ...h,
      mode: "vector" as const,
      vectorScore: 0,
    }));
  }

  const { vector } = await embedQuery(query);
  const noteMeta = new Map(
    db
      .select()
      .from(notes)
      .all()
      .map((n) => [n.id, n] as const),
  );

  const ranked = chunks
    .map((c) => {
      const emb = JSON.parse(c.embeddingJson) as number[];
      const sim = cosineSimilarity(vector, emb);
      return { chunk: c, sim };
    })
    .filter((x) => x.sim > 0.05)
    .sort((a, b) => b.sim - a.sim);

  const bestByNote = new Map<string, (typeof ranked)[number]>();
  for (const item of ranked) {
    const prev = bestByNote.get(item.chunk.noteId);
    if (!prev || item.sim > prev.sim) bestByNote.set(item.chunk.noteId, item);
  }

  return Array.from(bestByNote.values())
    .sort((a, b) => b.sim - a.sim)
    .slice(0, limit)
    .map(({ chunk, sim }) => {
      const note = noteMeta.get(chunk.noteId);
      return {
        noteId: chunk.noteId,
        title: note?.title ?? "未知笔记",
        snippet: chunk.content.slice(0, 200),
        score: Number(sim.toFixed(4)),
        tags: note?.tags ?? "",
        chunkId: chunk.id,
        mode: "vector" as const,
        vectorScore: Number(sim.toFixed(4)),
      };
    });
}

export function describeRetrieval() {
  const info = getEmbeddingInfo();
  const rag = getRagConfig();
  return {
    defaultMode: "hybrid" as const,
    embedding: info,
    rag,
  };
}

function countOccurrences(hay: string, needle: string) {
  if (!needle) return 0;
  let count = 0;
  let idx = 0;
  while (true) {
    idx = hay.indexOf(needle, idx);
    if (idx === -1) break;
    count += 1;
    idx += needle.length;
  }
  return count;
}

function makeSnippet(content: string, tokens: string[]) {
  const lower = content.toLowerCase();
  let pos = 0;
  for (const t of tokens) {
    const i = lower.indexOf(t);
    if (i >= 0) {
      pos = Math.max(0, i - 40);
      break;
    }
  }
  const slice = content.slice(pos, pos + 180).replace(/\s+/g, " ").trim();
  return (pos > 0 ? "…" : "") + slice + (pos + 180 < content.length ? "…" : "");
}
