export interface TextChunk {
  index: number;
  content: string;
}

/**
 * 按段落优先、再按长度切分。
 * 面试可讲：chunk 过大浪费上下文，过小丢语义；重叠缓解边界切断。
 */
export function chunkText(
  text: string,
  opts: { maxChars?: number; overlap?: number } = {},
): TextChunk[] {
  const maxChars = opts.maxChars ?? 480;
  const overlap = opts.overlap ?? 80;
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];

  const paragraphs = normalized
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  const raw: string[] = [];
  for (const para of paragraphs) {
    if (para.length <= maxChars) {
      raw.push(para);
      continue;
    }
    let start = 0;
    while (start < para.length) {
      const end = Math.min(start + maxChars, para.length);
      raw.push(para.slice(start, end));
      if (end >= para.length) break;
      start = Math.max(0, end - overlap);
    }
  }

  return raw.map((content, index) => ({ index, content }));
}
