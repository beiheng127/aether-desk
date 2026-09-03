import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getRagConfig } from "./rag-config";

describe("getRagConfig", () => {
  it("returns defaults when env unset", () => {
    const cfg = getRagConfig();
    assert.equal(cfg.defaultTopK, 5);
    assert.equal(cfg.rrfK, 60);
    assert.equal(cfg.keywordWeight, 1);
    assert.equal(cfg.vectorWeight, 1);
  });
});
