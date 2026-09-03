import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  canDecideHitl,
  invalidCitationIndexes,
  parseCitationIndexes,
  statusAfterHitlReject,
} from "./transitions";

describe("canDecideHitl", () => {
  it("allows only awaiting_approval", () => {
    assert.equal(canDecideHitl("awaiting_approval").ok, true);
    assert.equal(canDecideHitl("result").ok, false);
    assert.equal(canDecideHitl("result").code, "INVALID_STATUS");
    assert.equal(canDecideHitl("running").ok, false);
  });
});

describe("statusAfterHitlReject", () => {
  it("returns cancelled", () => {
    assert.equal(statusAfterHitlReject(), "cancelled");
  });
});

describe("citation parsing", () => {
  it("parses [n] from answer text", () => {
    assert.deepEqual(parseCitationIndexes("见 [1] 与 [3]，重复 [1]"), [1, 3]);
  });

  it("flags invalid indexes", () => {
    assert.deepEqual(invalidCitationIndexes([1, 2, 9], new Set([1, 2])), [9]);
  });
});
