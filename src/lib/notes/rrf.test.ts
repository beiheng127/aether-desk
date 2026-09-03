import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { rrfFusion, tokenize } from "./rrf";

describe("tokenize", () => {
  it("extracts latin tokens of length >= 2", () => {
    const tokens = tokenize("Agent Loop RAG");
    assert.ok(tokens.includes("agent"));
    assert.ok(tokens.includes("loop"));
    assert.ok(tokens.includes("rag"));
  });

  it("builds CJK bigrams", () => {
    const tokens = tokenize("混合检索");
    assert.ok(tokens.includes("混合"));
    assert.ok(tokens.includes("合检"));
    assert.ok(tokens.includes("检索"));
  });
});

describe("rrfFusion", () => {
  it("merges same noteId and ranks by reciprocal rank", () => {
    const kw = [
      { noteId: "a", score: 10, title: "A" },
      { noteId: "b", score: 8, title: "B" },
    ];
    const vec = [
      { noteId: "b", score: 0.9, title: "B" },
      { noteId: "c", score: 0.8, title: "C" },
    ];
    const fused = rrfFusion(kw, vec, 3);
    assert.equal(fused.length, 3);
    assert.equal(fused[0]?.noteId, "b");
    assert.equal(fused[0]?.keywordScore, 8);
    assert.equal(fused[0]?.vectorScore, 0.9);
  });

  it("respects keyword/vector weights", () => {
    const kw = [{ noteId: "k", score: 1, title: "K" }];
    const vec = [{ noteId: "v", score: 1, title: "V" }];
    const fused = rrfFusion(kw, vec, 2, {
      keywordWeight: 3,
      vectorWeight: 1,
      k: 60,
    });
    assert.equal(fused[0]?.noteId, "k");
  });

  it("respects limit", () => {
    const kw = [
      { noteId: "a", score: 1 },
      { noteId: "b", score: 1 },
      { noteId: "c", score: 1 },
    ];
    assert.equal(rrfFusion(kw, [], 2).length, 2);
  });
});
