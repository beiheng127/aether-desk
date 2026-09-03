export type RankedHit = {
  noteId: string;
  score: number;
  title?: string;
  snippet?: string;
  tags?: string;
  chunkId?: string;
  keywordScore?: number;
  vectorScore?: number;
  mode?: string;
};

export type RrfOptions = {
  /** RRF 常数，默认 60 */
  k?: number;
  /** 关键词列表权重，默认 1 */
  keywordWeight?: number;
  /** 向量列表权重，默认 1 */
  vectorWeight?: number;
};

/**
 * Reciprocal Rank Fusion：按排名融合两路命中。
 * 同 noteId 合并；分数 = Σ weight / (k + rank + 1)
 */
export function rrfFusion<T extends RankedHit>(
  keywordHits: T[],
  vectorHits: T[],
  limit: number,
  options: RrfOptions = {},
): Array<T & { keywordScore?: number; vectorScore?: number; score: number }> {
  const k = options.k ?? 60;
  const keywordWeight = options.keywordWeight ?? 1;
  const vectorWeight = options.vectorWeight ?? 1;

  const scores = new Map<
    string,
    {
      hit: T;
      rrf: number;
      keywordScore?: number;
      vectorScore?: number;
    }
  >();

  keywordHits.forEach((hit, rank) => {
    const cur = scores.get(hit.noteId) ?? {
      hit: { ...hit },
      rrf: 0,
    };
    cur.rrf += keywordWeight / (k + rank + 1);
    cur.keywordScore = hit.score;
    cur.hit = { ...cur.hit, ...hit };
    scores.set(hit.noteId, cur);
  });

  vectorHits.forEach((hit, rank) => {
    const cur = scores.get(hit.noteId) ?? {
      hit: { ...hit },
      rrf: 0,
    };
    cur.rrf += vectorWeight / (k + rank + 1);
    cur.vectorScore = hit.score;
    cur.hit = {
      ...cur.hit,
      ...hit,
      snippet: hit.snippet || cur.hit.snippet,
      chunkId: hit.chunkId ?? cur.hit.chunkId,
    };
    scores.set(hit.noteId, cur);
  });

  return Array.from(scores.values())
    .sort((a, b) => b.rrf - a.rrf)
    .slice(0, limit)
    .map(({ hit, rrf, keywordScore, vectorScore }) => ({
      ...hit,
      score: Number(rrf.toFixed(5)),
      keywordScore,
      vectorScore,
    }));
}

export function tokenize(q: string): string[] {
  const lower = q.toLowerCase();
  const latin = lower.match(/[a-z0-9_]{2,}/g) ?? [];
  const cjk = lower.match(/[\u4e00-\u9fff]{2,}/g) ?? [];
  const grams: string[] = [];
  for (const chunk of cjk) {
    if (chunk.length <= 2) grams.push(chunk);
    else {
      for (let i = 0; i < chunk.length - 1; i++) {
        grams.push(chunk.slice(i, i + 2));
      }
    }
  }
  return Array.from(new Set([...latin, ...grams]));
}
