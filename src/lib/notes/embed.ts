/**
 * Embedding 提供方
 * ----------------
 * 推荐生产：OpenAI text-embedding-3-small（或兼容网关的 bge-m3 / text-embedding-3-small）
 * 离线兜底：local-hash（确定性 hashing trick，无网络也能建库自测）
 *
 * 注意：仅有 DEEPSEEK_API_KEY 时通常不能调 embedding 接口，会自动回退 local-hash。
 * 单独配置 EMBEDDING_API_KEY + EMBEDDING_BASE_URL 即可接入国内兼容网关。
 */

export type EmbeddingProviderKind = "openai-compatible" | "local-hash";

export interface EmbeddingInfo {
  provider: EmbeddingProviderKind;
  model: string;
  dims: number;
  /** true = 远程 embedding；false = 正在用本地兜底 */
  remote: boolean;
}

const LOCAL_DIMS = 384;

export function getEmbeddingInfo(): EmbeddingInfo {
  if (process.env.EMBEDDING_PROVIDER === "local-hash") {
    return {
      provider: "local-hash",
      model: "local-hash-v1",
      dims: LOCAL_DIMS,
      remote: false,
    };
  }

  const embKey =
    process.env.EMBEDDING_API_KEY ||
    process.env.OPENAI_API_KEY ||
    process.env.AI_GATEWAY_API_KEY;

  if (embKey) {
    return {
      provider: "openai-compatible",
      model: process.env.EMBEDDING_MODEL || "text-embedding-3-small",
      dims: Number(process.env.EMBEDDING_DIMS || 1536),
      remote: true,
    };
  }

  return {
    provider: "local-hash",
    model: "local-hash-v1",
    dims: LOCAL_DIMS,
    remote: false,
  };
}

export async function embedTexts(texts: string[]): Promise<{
  vectors: number[][];
  info: EmbeddingInfo;
}> {
  const info = getEmbeddingInfo();
  if (texts.length === 0) return { vectors: [], info };

  if (!info.remote) {
    return {
      vectors: texts.map((t) => localHashEmbed(t, info.dims)),
      info,
    };
  }

  const apiKey =
    process.env.EMBEDDING_API_KEY ||
    process.env.OPENAI_API_KEY ||
    process.env.AI_GATEWAY_API_KEY;

  if (!apiKey) {
    return {
      vectors: texts.map((t) => localHashEmbed(t, LOCAL_DIMS)),
      info: {
        provider: "local-hash",
        model: "local-hash-v1",
        dims: LOCAL_DIMS,
        remote: false,
      },
    };
  }

  const baseURL = (
    process.env.EMBEDDING_BASE_URL ||
    process.env.AI_BASE_URL ||
    "https://api.openai.com/v1"
  ).replace(/\/$/, "");

  const res = await fetch(`${baseURL}/embeddings`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: info.model,
      input: texts,
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    // 远程失败时优雅降级，避免整站检索不可用
    console.warn("[embed] remote failed, fallback local-hash:", errText.slice(0, 180));
    return {
      vectors: texts.map((t) => localHashEmbed(t, LOCAL_DIMS)),
      info: {
        provider: "local-hash",
        model: "local-hash-v1",
        dims: LOCAL_DIMS,
        remote: false,
      },
    };
  }

  const json = (await res.json()) as {
    data: Array<{ embedding: number[]; index: number }>;
  };
  const sorted = [...json.data].sort((a, b) => a.index - b.index);
  const vectors = sorted.map((d) => d.embedding);
  return {
    vectors,
    info: {
      ...info,
      dims: vectors[0]?.length ?? info.dims,
    },
  };
}

export async function embedQuery(text: string) {
  const { vectors, info } = await embedTexts([text]);
  return { vector: vectors[0] ?? [], info };
}

/** Cosine similarity in [-1, 1] */
export function cosineSimilarity(a: number[], b: number[]) {
  if (a.length === 0 || b.length === 0 || a.length !== b.length) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i]! * b[i]!;
    na += a[i]! * a[i]!;
    nb += b[i]! * b[i]!;
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

/**
 * 本地 hashing trick：把 token 哈希到固定维度并 L2 normalize。
 * 不是 SOTA 语义模型，但可离线建库、测通管道；有 Key 时自动切远程 embedding。
 */
export function localHashEmbed(text: string, dims = LOCAL_DIMS): number[] {
  const vec = new Array<number>(dims).fill(0);
  const tokens =
    text.toLowerCase().match(/[a-z0-9_]{2,}|[\u4e00-\u9fff]{1,2}/g) ?? ["empty"];

  for (const token of tokens) {
    let h = 2166136261;
    for (let i = 0; i < token.length; i++) {
      h ^= token.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    const idx = Math.abs(h) % dims;
    const sign = h & 1 ? 1 : -1;
    vec[idx]! += sign;
  }

  let norm = 0;
  for (const v of vec) norm += v * v;
  norm = Math.sqrt(norm) || 1;
  return vec.map((v) => v / norm);
}
