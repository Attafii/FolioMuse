// ─── ExperimentService (ADR-0004 D4) ─────────────────────────────────────
// Minimal deterministic A/B experiments.
//   - register: validates config (>=2 variants, weights sum to 1, guardrail
//     thresholds within sane bounds); status DRAFT on create.
//   - assign: deterministic SHA-256 bucketing of `${experimentId}:${subjectKey}`
//     (stdlib crypto, NO Math.random); same subject always gets same variant.
//   - evaluateGuardrails: compares metrics against guardrailConfig; returns a
//     PAUSED recommendation when breached — NEVER auto-disables (caller decides).
// Telemetry: counts/enums only, never raw subject keys (caller passes hashed).
// NO Prisma/Next imports (AGENTS.md §7).

import { createHash } from "node:crypto";

import { ExperimentConfigSchema } from "./schemas";
import type {
  ExperimentAssignmentRecord,
  ExperimentConfigInput,
  ExperimentGuardrails,
  ExperimentRecord,
  GuardrailEvaluation,
} from "./types";
import type { ExperimentRegistry, FlywheelClock, FlywheelTelemetry } from "./ports";

// ─── Typed results ────────────────────────────────────────────────────────

export type RegisterExperimentResult =
  | { ok: true; experiment: ExperimentRecord }
  | { ok: false; error: "VALIDATION_FAILED"; issues: string[] };

export type AssignVariantResult =
  | { ok: true; assignment: ExperimentAssignmentRecord }
  | { ok: false; error: "EXPERIMENT_NOT_FOUND" | "EXPERIMENT_NOT_RUNNING"; message: string };

export interface GuardrailMetrics {
  originalityDeviation: number; // 0..1 (higher = more deviation from baseline)
  diversityIndex: number; // 0..1 (higher = more diverse)
  attributionViolations: number; // count
}

// ─── Implementation ───────────────────────────────────────────────────────

export class ExperimentService {
  constructor(
    private readonly registry: ExperimentRegistry,
    private readonly clock: FlywheelClock,
    private readonly telemetry: FlywheelTelemetry,
  ) {}

  async register(config: ExperimentConfigInput): Promise<RegisterExperimentResult> {
    const parsed = ExperimentConfigSchema.safeParse(config);
    if (!parsed.success) {
      const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
      return { ok: false, error: "VALIDATION_FAILED", issues };
    }
    const experiment = await this.registry.registerExperiment(parsed.data);
    this.telemetry.emit({
      type: "EXPERIMENT_REGISTERED",
      experimentId: experiment.id,
      timestamp: this.clock.now(),
    });
    return { ok: true, experiment };
  }

  async assign(experimentId: string, subjectKey: string): Promise<AssignVariantResult> {
    const experiment = await this.registry.getExperiment(experimentId);
    if (!experiment) {
      return { ok: false, error: "EXPERIMENT_NOT_FOUND", message: `no experiment ${experimentId}` };
    }
    if (experiment.status !== "RUNNING" && experiment.status !== "DRAFT") {
      return {
        ok: false,
        error: "EXPERIMENT_NOT_RUNNING",
        message: `experiment ${experimentId} is ${experiment.status}`,
      };
    }
    const assignment = await this.registry.assignVariant(experimentId, subjectKey);
    this.telemetry.emit({
      type: "EXPERIMENT_ASSIGNED",
      experimentId,
      variant: assignment.variant,
      timestamp: this.clock.now(),
    });
    return { ok: true, assignment };
  }

  async evaluateGuardrails(
    experimentId: string,
    metrics: GuardrailMetrics,
  ): Promise<GuardrailEvaluation> {
    const experiment = await this.registry.getExperiment(experimentId);
    if (!experiment) {
      return { experimentId, recommendation: "PAUSED", breached: ["experiment_not_found"] };
    }
    const breached: string[] = [];
    const g: ExperimentGuardrails = experiment.guardrailConfig;

    if (metrics.originalityDeviation > g.maxOriginalityDeviation) {
      breached.push("originality_deviation");
    }
    if (metrics.diversityIndex < g.minDiversity) {
      breached.push("diversity");
    }
    if (metrics.attributionViolations > g.maxAttributionViolations) {
      breached.push("attribution_violations");
    }

    if (breached.length > 0) {
      this.telemetry.emit({
        type: "GUARDRAIL_BREACH",
        experimentId,
        breached,
        timestamp: this.clock.now(),
      });
      return { experimentId, recommendation: "PAUSED", breached };
    }
    return { experimentId, recommendation: "RUNNING", breached: [] };
  }

  /**
   * Deterministic variant bucketing — pure helper, exported for tests.
   * Same (variants, subjectKey, experimentId) always yields the same variant.
   */
  static bucket(
    experimentId: string,
    subjectKey: string,
    variants: Array<{ key: string; weight: number }>,
  ): string {
    const digest = createHash("sha256").update(`${experimentId}:${subjectKey}`).digest("hex");
    const bucket = parseInt(digest.slice(0, 4), 16) / 0xffff;
    const total = variants.reduce((acc, v) => acc + v.weight, 0);
    let cumulative = 0;
    for (const v of variants) {
      cumulative += v.weight / total;
      if (bucket < cumulative) return v.key;
    }
    return variants[variants.length - 1].key;
  }
}

// Re-export the config schema so tests can construct valid inputs.
export { ExperimentConfigSchema };
