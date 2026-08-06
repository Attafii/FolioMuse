// ─── ExperimentService unit tests (ADR-0004 D4) ──────────────────────────
// TDD: deterministic assignment (same subject → same variant), config
// validation rejects bad weights, guardrail evaluation flags breach.

import { describe, expect, it } from "vitest";

import {
  ExperimentService,
  type GuardrailMetrics,
} from "@/domain/flywheel/experiment-service";
import {
  FakeFlywheelClock,
  InMemoryExperimentRegistry,
  SpyFlywheelTelemetry,
  TS,
  makeExperimentConfig,
} from "@/domain/flywheel/__tests__/flywheel-test-fakes";

describe("ExperimentService", () => {
  function makeService() {
    const registry = new InMemoryExperimentRegistry();
    const telemetry = new SpyFlywheelTelemetry();
    const clock = new FakeFlywheelClock(TS);
    const service = new ExperimentService(registry, clock, telemetry);
    return { registry, telemetry, clock, service };
  }

  it("registers a valid experiment in DRAFT status", async () => {
    const { service, telemetry } = makeService();
    const result = await service.register(makeExperimentConfig({ name: "exp-1" }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.experiment.status).toBe("DRAFT");
    expect(result.experiment.variants).toHaveLength(2);
    expect(telemetry.events[0]).toMatchObject({
      type: "EXPERIMENT_REGISTERED",
      experimentId: result.experiment.id,
    });
  });

  it("rejects configs with a single variant", async () => {
    const { service } = makeService();
    const result = await service.register(
      makeExperimentConfig({ variants: [{ key: "only", weight: 1 }] }),
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe("VALIDATION_FAILED");
  });

  it("rejects configs whose weights do not sum to 1", async () => {
    const { service } = makeService();
    const result = await service.register(
      makeExperimentConfig({
        variants: [
          { key: "a", weight: 0.7 },
          { key: "b", weight: 0.1 },
        ],
      }),
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues.some((i) => i.includes("sum to 1"))).toBe(true);
  });

  it("rejects configs with a zero-weight variant", async () => {
    const { service } = makeService();
    const result = await service.register(
      makeExperimentConfig({
        variants: [
          { key: "a", weight: 0 },
          { key: "b", weight: 1 },
        ],
      }),
    );
    expect(result.ok).toBe(false);
  });

  it("assigns deterministically: same subject always gets the same variant", async () => {
    const { service } = makeService();
    const reg = await service.register(makeExperimentConfig());
    if (!reg.ok) throw new Error("setup failed");
    const experimentId = reg.experiment.id;

    const subject = "a".repeat(64);
    const first = await service.assign(experimentId, subject);
    const second = await service.assign(experimentId, subject);
    expect(first.ok && second.ok).toBe(true);
    if (!first.ok || !second.ok) return;
    expect(first.assignment.variant).toBe(second.assignment.variant);
    // Different subject may (probabilistically) differ, but must always be a
    // valid variant key.
    const other = await service.assign(experimentId, "b".repeat(64));
    if (other.ok) {
      expect(reg.experiment.variants.map((v) => v.key)).toContain(other.assignment.variant);
    }
  });

  it("static bucket() is deterministic and covers all variants", async () => {
    const variants = [
      { key: "control", weight: 0.5 },
      { key: "treatment", weight: 0.5 },
    ];
    const seen = new Set<string>();
    for (let i = 0; i < 100; i++) {
      const variant = ExperimentService.bucket(`exp-${i}`, `subject-${i}`, variants);
      seen.add(variant);
      // Determinism check on repeated call.
      expect(ExperimentService.bucket(`exp-${i}`, `subject-${i}`, variants)).toBe(variant);
    }
    expect(seen.size).toBe(2);
  });

  it("flags a guardrail breach and recommends PAUSED", async () => {
    const { service, telemetry } = makeService();
    const reg = await service.register(
      makeExperimentConfig({
        guardrailConfig: {
          maxOriginalityDeviation: 0.2,
          minDiversity: 0.3,
          maxAttributionViolations: 1,
        },
      }),
    );
    if (!reg.ok) throw new Error("setup failed");

    const metrics: GuardrailMetrics = {
      originalityDeviation: 0.5, // > 0.2 → breach
      diversityIndex: 0.4,
      attributionViolations: 0,
    };
    const evaluation = await service.evaluateGuardrails(reg.experiment.id, metrics);
    expect(evaluation.recommendation).toBe("PAUSED");
    expect(evaluation.breached).toContain("originality_deviation");
    expect(telemetry.events.some((e) => e.type === "GUARDRAIL_BREACH")).toBe(true);
  });

  it("returns RUNNING when all metrics are within bounds", async () => {
    const { service } = makeService();
    const reg = await service.register(
      makeExperimentConfig({
        guardrailConfig: {
          maxOriginalityDeviation: 0.2,
          minDiversity: 0.3,
          maxAttributionViolations: 1,
        },
      }),
    );
    if (!reg.ok) throw new Error("setup failed");

    const evaluation = await service.evaluateGuardrails(reg.experiment.id, {
      originalityDeviation: 0.1,
      diversityIndex: 0.8,
      attributionViolations: 0,
    });
    expect(evaluation.recommendation).toBe("RUNNING");
    expect(evaluation.breached).toEqual([]);
  });

  it("returns EXPERIMENT_NOT_FOUND for unknown experiments", async () => {
    const { service } = makeService();
    const result = await service.assign("nope", "a".repeat(64));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe("EXPERIMENT_NOT_FOUND");
  });
});
