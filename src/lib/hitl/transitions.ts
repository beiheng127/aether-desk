/** HITL 写操作状态机：仅 awaiting_approval 可批准/拒绝 */

export type HitlDecision = "approve" | "reject";

export function canDecideHitl(status: string): {
  ok: boolean;
  code?: string;
  error?: string;
} {
  if (status === "awaiting_approval") {
    return { ok: true };
  }
  return {
    ok: false,
    code: "INVALID_STATUS",
    error: `当前状态为 ${status}，仅 awaiting_approval 可处理`,
  };
}

export function statusAfterHitlReject(): "cancelled" {
  return "cancelled";
}

export function parseCitationIndexes(text: string): number[] {
  const found = new Set<number>();
  const re = /\[(\d+)\]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const n = Number(m[1]);
    if (Number.isFinite(n) && n > 0) found.add(n);
  }
  return Array.from(found).sort((a, b) => a - b);
}

export function invalidCitationIndexes(
  mentioned: number[],
  valid: Set<number> | number[],
): number[] {
  const set = valid instanceof Set ? valid : new Set(valid);
  return mentioned.filter((n) => !set.has(n));
}
