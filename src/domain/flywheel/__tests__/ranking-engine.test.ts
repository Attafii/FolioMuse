// ─── RankingEngine unit tests (ADR-0004 D2/D3/D5) ────────────────────────
// TDD: determinism, saturation decay, diversity cap, eligibility exclusion,
// explanation codes.

import { describe, expect, it } from "vitest";

import { RankingEngine } from "@/domain/flywheel/ranking-engine";
import type { RankableItem, RankingParams } from "@/domain/flywheel/types";

const NOW = "2026-08-06T00:00:00.000Z";

function item(overrides: Partial<RankableItem> = {}): RankableItem {
  return {
    id: "i1",
    title: "Item",
    creatorId: "c1",
    creatorName: "Creator One",
    status: "ACCEPTED",
    qualityScore: 0.7,
    acceptedAt: "2026-08-01T00:00:00.000Z",
    ...overrides,
  };
}

const DEFAULT_PARAMS: RankingParams = {
  wQuality: 1,
  wRecency: 1,
  wUtility: 1,
  saturationLambda: 0.01,
  maxItemsPerCreator: 2,
  topN: 20,
};

describe("RankingEngine", () => {
  const engine = new RankingEngine();

  it("is deterministic: same input yields identical output", () => {
    const items = [item({ id: "a" }), item({ id: "b", qualityScore: 0.9 })];
    const utility = new Map([
      ["a", 5],
      ["b", 3],
    ]);
    const first = engine.computeRanking(items, utility, DEFAULT_PARAMS, NOW);
    const second = engine.computeRanking(items, utility, DEFAULT_PARAMS, NOW);
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
  });

  it("excludes ineligible items regardless of engagement", () => {
    const items = [
      item({ id: "rejected", status: "REJECTED", qualityScore: 0.9 }),
      item({ id: "suspended", status: "SUSPENDED", qualityScore: 0.9 }),
      item({ id: "pending", status: "PENDING_REVIEW", qualityScore: 0.9 }),
      item({ id: "accepted", status: "ACCEPTED", qualityScore: 0.5 }),
    ];
    const utility = new Map([
      ["rejected", 1000],
      ["suspended", 1000],
      ["pending", 1000],
      ["accepted", 1],
    ]);
    const result = engine.computeRanking(items, utility, DEFAULT_PARAMS, NOW);
    expect(result.map((r) => r.itemId)).toEqual(["accepted"]);
  });

  it("applies saturation decay: old high-engagement item loses to fresh item", () => {
    const old = item({
      id: "old",
      acceptedAt: "2025-08-06T00:00:00.000Z", // 1 year old
      qualityScore: 0.5,
    });
    const fresh = item({
      id: "fresh",
      acceptedAt: "2026-08-05T00:00:00.000Z", // 1 day old
      qualityScore: 0.5,
    });
    const utility = new Map([
      ["old", 1000],
      ["fresh", 10],
    ]);
    const result = engine.computeRanking([old, fresh], utility, DEFAULT_PARAMS, NOW);
    expect(result[0].itemId).toBe("fresh");
  });

  it("enforces the per-creator diversity cap", () => {
    const items = [
      item({ id: "c1a", creatorId: "c1", qualityScore: 0.9 }),
      item({ id: "c1b", creatorId: "c1", qualityScore: 0.89 }),
      item({ id: "c1c", creatorId: "c1", qualityScore: 0.88 }),
      item({ id: "c2a", creatorId: "c2", qualityScore: 0.1 }),
    ];
    const utility = new Map([
      ["c1a", 100],
      ["c1b", 90],
      ["c1c", 80],
      ["c2a", 1],
    ]);
    const result = engine.computeRanking(items, utility, DEFAULT_PARAMS, NOW);
    const c1Count = result.filter((r) => r.creatorId === "c1").length;
    expect(c1Count).toBeLessThanOrEqual(2);
    expect(result.length).toBe(3); // c1a, c1b, c2a
    expect(result.map((r) => r.creatorId)).toContain("c2");
  });

  it("returns explanation reason codes on every result", () => {
    const items = [
      item({ id: "q", qualityScore: 0.95 }),
      item({ id: "n", qualityScore: 0.5, acceptedAt: "2026-08-05T00:00:00.000Z" }),
    ];
    const utility = new Map([
      ["q", 0],
      ["n", 0],
    ]);
    const result = engine.computeRanking(items, utility, DEFAULT_PARAMS, NOW);
    expect(result.every((r) => typeof r.explanationReasonCode === "string")).toBe(true);
    expect(result[0].explanationReasonCode).toBe("QUALITY");
  });

  it("returns a safe projection (no content fields)", () => {
    const result = engine.computeRanking(
      [item()],
      new Map([["i1", 1]]),
      DEFAULT_PARAMS,
      NOW,
    );
    expect(result[0]).not.toHaveProperty("contentBlob");
    expect(result[0]).not.toHaveProperty("structureJSON");
    expect(result[0]).not.toHaveProperty("sourceUrl");
    expect(Object.keys(result[0]).sort()).toEqual(
      [
        "itemId",
        "title",
        "creatorId",
        "creatorName",
        "qualityScore",
        "recencyScore",
        "utilityScore",
        "finalRankScore",
        "explanationReasonCode",
      ].sort(),
    );
  });

  it("handles empty inputs without error", () => {
    const result = engine.computeRanking([], new Map(), DEFAULT_PARAMS, NOW);
    expect(result).toEqual([]);
  });

  it("does not rank a zero-utility accepted item ahead of a high-quality one", () => {
    const zeroUtility = item({ id: "zero", qualityScore: 0.5 });
    const highQuality = item({ id: "hq", qualityScore: 0.9 });
    const utility = new Map([
      ["zero", 0],
      ["hq", 0],
    ]);
    const result = engine.computeRanking([zeroUtility, highQuality], utility, DEFAULT_PARAMS, NOW);
    expect(result[0].itemId).toBe("hq");
  });
});
