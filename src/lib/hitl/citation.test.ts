import assert from "node:assert/strict";
import { describe, it } from "node:test";

/** 与 desk-store.collectValidCitationIndexes 同逻辑的纯函数拷贝，避免拉入 zustand/client */
function collectValidCitationIndexes(
  artifacts: Array<{
    kind: string;
    payload?: { citations?: Array<{ index: number }> };
  }>,
): Set<number> {
  const indexes = new Set<number>();
  for (const a of artifacts) {
    if (a.kind !== "note") continue;
    for (const c of a.payload?.citations ?? []) {
      indexes.add(c.index);
    }
  }
  return indexes;
}

describe("collectValidCitationIndexes", () => {
  it("collects from note artifacts only", () => {
    const set = collectValidCitationIndexes([
      {
        kind: "note",
        payload: {
          citations: [{ index: 1 }, { index: 2 }],
        },
      },
      { kind: "table_card", payload: {} },
    ]);
    assert.equal(set.has(1), true);
    assert.equal(set.has(2), true);
    assert.equal(set.has(9), false);
  });
});
