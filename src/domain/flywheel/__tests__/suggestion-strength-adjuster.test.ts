// ─── SuggestionStrengthAdjuster unit tests (ADR-0004, R2/R5) ─────────────
// TDD: R2 floor, behavior uplift bounded, dismissal dampens, explanation
// codes, no content copy.

import { describe, expect, it } from "vitest";

import { SuggestionStrengthAdjuster } from "@/domain/flywheel/suggestion-strength-adjuster";
import type { FlywheelEvent, PatternSignalRecord, SuggestionParams } from "@/domain/flywheel/types";
import { SUBJECT_A, TS } from "@/domain/flywheel/__tests__/flywheel-test-fakes";

const PARAMS: SuggestionParams = {
  minEligibleItems: 3,
  minDistinctCreators: 2,
  maxUplift: 0.3,
  maxSuggestionStrength: 1,
};

function signal(overrides: Partial<PatternSignalRecord> = {}): PatternSignalRecord {
  return {
    id: "sig-1",
    patternType: "EDITORIAL_HERO",
    eligibleItemCount: 5,
    distinctCreatorCount: 3,
    ...overrides,
  };
}

function event(overrides: Partial<FlywheelEvent> = {}): FlywheelEvent {
  return {
    id: "e1",
    eventType: "MCP_RETRIEVAL_USE",
    subjectKey: SUBJECT_A,
    itemId: null,
    patternSignalId: "sig-1",
    experimentId: null,
    variant: null,
    occurredAt: TS,
    idempotencyKey: "idem-1",
    payload: {},
    createdAt: TS,
    ...overrides,
  };
}

describe("SuggestionStrengthAdjuster", () => {
  const adjuster = new SuggestionStrengthAdjuster();

  it("enforces the R2 floor: below-floor signals contribute zero", () => {
    const result = adjuster.adjust(
      [
        signal({ id: "below", eligibleItemCount: 2, distinctCreatorCount: 2 }),
        signal({ id: "below-creators", eligibleItemCount: 5, distinctCreatorCount: 1 }),
      ],
      [],
      PARAMS,
      TS,
    );
    expect(result.every((s) => s.suggestionStrength === 0)).toBe(true);
    expect(result.every((s) => s.explanationReasonCode === "PATTERN_FREQUENCY")).toBe(true);
  });

  it("applies positive behavior uplift for signals at/above the floor", () => {
    const above = signal({ id: "above" });
    const base = adjuster.adjust([above], [], PARAMS, TS)[0];
    const boosted = adjuster.adjust(
      [above],
      [
        event({ id: "e1", patternSignalId: "above" }),
        event({ id: "e2", patternSignalId: "above" }),
        event({ id: "e3", patternSignalId: "above" }),
        event({ id: "e4", patternSignalId: "above" }),
      ],
      PARAMS,
      TS,
    )[0];
    expect(boosted.suggestionStrength).toBeGreaterThan(base.suggestionStrength);
  });

  it("bounds the uplift so one popular pattern cannot dominate", () => {
    const hot = signal({ id: "hot" });
    const manyEvents = Array.from({ length: 200 }, (_, i) =>
      event({ id: `e${i}`, idempotencyKey: `idem-${i}` }),
    );
    const result = adjuster.adjust([hot], manyEvents, PARAMS, TS)[0];
    expect(result.suggestionStrength).toBeLessThanOrEqual(PARAMS.maxSuggestionStrength);
    // Strength must also respect the bounded uplift (base + maxUplift).
    expect(result.suggestionStrength).toBeLessThanOrEqual(
      PARAMS.maxSuggestionStrength + PARAMS.maxUplift,
    );
  });

  it("dampens strength when dismissals dominate", () => {
    const target = signal({ id: "dismissed" });
    const noEvents = adjuster.adjust([target], [], PARAMS, TS)[0];
    const dismissed = adjuster.adjust(
      [target],
      [
        event({ id: "d1", eventType: "DISMISSAL", patternSignalId: "dismissed" }),
        event({ id: "d2", eventType: "DISMISSAL", patternSignalId: "dismissed" }),
        event({ id: "d3", eventType: "DISMISSAL", patternSignalId: "dismissed" }),
        event({ id: "d4", eventType: "DISMISSAL", patternSignalId: "dismissed" }),
        event({ id: "d5", eventType: "DISMISSAL", patternSignalId: "dismissed" }),
        event({ id: "d6", eventType: "DISMISSAL", patternSignalId: "dismissed" }),
      ],
      PARAMS,
      TS,
    )[0];
    expect(dismissed.suggestionStrength).toBeLessThan(noEvents.suggestionStrength);
  });

  it("never copies gallery content into suggestions (R2/R5)", () => {
    const result = adjuster.adjust([signal()], [], PARAMS, TS);
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain("contentBlob");
    expect(serialized).not.toContain("structureJSON");
    expect(serialized).not.toContain("sourceUrl");
    expect(result[0]).toEqual({
      patternSignalId: "sig-1",
      suggestionStrength: expect.any(Number),
      explanationReasonCode: "PATTERN_FREQUENCY",
      lastComputedAt: TS,
    });
  });

  it("is deterministic: same inputs yield identical output", () => {
    const signals = [signal(), signal({ id: "sig-2", eligibleItemCount: 2 })];
    const events = [event()];
    const first = adjuster.adjust(signals, events, PARAMS, TS);
    const second = adjuster.adjust(signals, events, PARAMS, TS);
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
  });

  it("does not mutate input PatternSignal records (ADR-0002 no rewrite)", () => {
    const original = signal();
    const snapshot = JSON.parse(JSON.stringify(original));
    adjuster.adjust([original], [], PARAMS, TS);
    expect(JSON.stringify(original)).toBe(JSON.stringify(snapshot));
  });
});
