/** Hybrid 检索可调参数（环境变量） */

function numEnv(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export function getRagConfig() {
  return {
    defaultTopK: Math.min(Math.floor(numEnv("AETHER_RAG_TOP_K", 5)), 20),
    rrfK: Math.min(Math.floor(numEnv("AETHER_RAG_RRF_K", 60)), 200),
    keywordWeight: numEnv("AETHER_RAG_KW_WEIGHT", 1),
    vectorWeight: numEnv("AETHER_RAG_VEC_WEIGHT", 1),
  };
}
