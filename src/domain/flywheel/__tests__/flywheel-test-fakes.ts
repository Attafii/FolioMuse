// ─── Shared test fakes + fixture factories (ADR-0004) ─────────────────────
// Synthetic fixtures only (RFC 2606 .invalid). Plain classes + vi.fn spies —
// no vitest test bodies here.

import { createHash } from "node:crypto";
import { vi } from "vitest";

import type {
  ExperimentRegistry,
  FlywheelClock,
  FlywheelEventRepository,
  FlywheelTelemetry,
  RankingStore,
} from "@/domain/flywheel/ports";
import type {
  ExperimentAssignmentRecord,
  ExperimentConfigInput,
  ExperimentRecord,
  FlywheelEvent,
  FlywheelEventFilter,
  FlywheelTelemetryEvent,
  NewFlywheelEventInput,
  RankingScoreRecord,
  SignalScoreRecord,
} from "@/domain/flywheel/types";

export const TS = "2026-08-06T00:00:00.000Z";

/** 64-hex-char SHA-256-shaped subject key (synthetic, deterministic). */
export function hashKey(seed: string): string {
  return createHash("sha256").update(seed).digest("hex");
}

export const SUBJECT_A = hashKey("subject-a");
export const SUBJECT_B = hashKey("subject-b");

// ─── FlywheelEventRepository fake ─────────────────────────────────────────

export class InMemoryFlywheelEventRepository implements FlywheelEventRepository {
  private events = new Map<string, FlywheelEvent>();
  private byKey = new Map<string, FlywheelEvent>();
  private n = 0;

  async recordEvent(input: NewFlywheelEventInput): Promise<FlywheelEvent> {
    const existing = this.byKey.get(input.idempotencyKey);
    if (existing) return existing;
    const rec: FlywheelEvent = {
      id: `event-${++this.n}`,
      eventType: input.eventType,
      subjectKey: input.subjectKey,
      itemId: input.itemId ?? null,
      patternSignalId: input.patternSignalId ?? null,
      experimentId: input.experimentId ?? null,
      variant: input.variant ?? null,
      occurredAt: input.occurredAt,
      idempotencyKey: input.idempotencyKey,
      payload: input.payload ?? {},
      createdAt: TS,
    };
    this.events.set(rec.id, rec);
    this.byKey.set(rec.idempotencyKey, rec);
    return rec;
  }

  async findEventByIdempotencyKey(idempotencyKey: string): Promise<FlywheelEvent | null> {
    return this.byKey.get(idempotencyKey) ?? null;
  }

  async listEvents(filter: FlywheelEventFilter = {}): Promise<FlywheelEvent[]> {
    return [...this.events.values()].filter((e) => {
      if (filter.eventType && e.eventType !== filter.eventType) return false;
      if (filter.itemId && e.itemId !== filter.itemId) return false;
      if (filter.patternSignalId && e.patternSignalId !== filter.patternSignalId) return false;
      if (filter.subjectKey && e.subjectKey !== filter.subjectKey) return false;
      if (filter.since && e.occurredAt < filter.since) return false;
      if (filter.until && e.occurredAt >= filter.until) return false;
      return true;
    });
  }
}

// ─── RankingStore fake ────────────────────────────────────────────────────

export class InMemoryRankingStore implements RankingStore {
  private rankingScores = new Map<string, RankingScoreRecord>();
  private signalScores = new Map<string, SignalScoreRecord>();

  async saveRankingScore(score: RankingScoreRecord): Promise<void> {
    this.rankingScores.set(score.itemId, score);
  }

  async listRankingScores(): Promise<RankingScoreRecord[]> {
    return [...this.rankingScores.values()];
  }

  async saveSignalScore(score: SignalScoreRecord): Promise<void> {
    this.signalScores.set(score.patternSignalId, score);
  }

  async listSignalScores(): Promise<SignalScoreRecord[]> {
    return [...this.signalScores.values()];
  }
}

// ─── ExperimentRegistry fake (deterministic via crypto hash) ──────────────

export class InMemoryExperimentRegistry implements ExperimentRegistry {
  private experiments = new Map<string, ExperimentRecord>();
  private assignments = new Map<string, ExperimentAssignmentRecord>();
  private n = 0;

  async registerExperiment(config: ExperimentConfigInput): Promise<ExperimentRecord> {
    const rec: ExperimentRecord = {
      id: `experiment-${++this.n}`,
      name: config.name,
      description: config.description ?? null,
      status: "DRAFT",
      variants: config.variants,
      guardrailConfig: config.guardrailConfig,
      startedAt: null,
      endedAt: null,
      createdAt: TS,
    };
    this.experiments.set(rec.id, rec);
    return rec;
  }

  async getExperiment(id: string): Promise<ExperimentRecord | null> {
    return this.experiments.get(id) ?? null;
  }

  async assignVariant(
    experimentId: string,
    subjectKey: string,
  ): Promise<ExperimentAssignmentRecord> {
    const compositeKey = `${experimentId}:${subjectKey}`;
    const existing = this.assignments.get(compositeKey);
    if (existing) return existing;
    const experiment = this.experiments.get(experimentId);
    if (!experiment) throw new Error(`experiment ${experimentId} not found`);
    const digest = createHash("sha256").update(compositeKey).digest("hex");
    const bucket = parseInt(digest.slice(0, 4), 16);
    const total = experiment.variants.reduce((acc, v) => acc + v.weight, 0);
    let cumulative = 0;
    let variant = experiment.variants[0].key;
    for (const v of experiment.variants) {
      cumulative += v.weight / total;
      if (bucket / 0xffff < cumulative) {
        variant = v.key;
        break;
      }
    }
    const rec: ExperimentAssignmentRecord = {
      id: `assignment-${++this.n}`,
      experimentId,
      subjectKey,
      variant,
      assignedAt: TS,
    };
    this.assignments.set(compositeKey, rec);
    return rec;
  }

  async listExperiments(): Promise<ExperimentRecord[]> {
    return [...this.experiments.values()];
  }
}

// ─── Clock + Telemetry fakes ──────────────────────────────────────────────

export class FakeFlywheelClock implements FlywheelClock {
  private current: string;
  constructor(initial: string = TS) {
    this.current = initial;
  }
  now(): string {
    return this.current;
  }
  set(iso: string): void {
    this.current = iso;
  }
}

export class SpyFlywheelTelemetry implements FlywheelTelemetry {
  events: FlywheelTelemetryEvent[] = [];
  emit(event: FlywheelTelemetryEvent): void {
    this.events.push(event);
  }
  /** Returns true if any emitted event carries a key referencing content. */
  hasContentLeak(): boolean {
    const serialized = JSON.stringify(this.events);
    return (
      serialized.includes("contentBlob") ||
      serialized.includes("structureJSON") ||
      serialized.includes("sourceUrl") ||
      serialized.includes("prompt")
    );
  }
}

// ─── Fixture factories (TEST_PREFIX + counter pattern) ───────────────────

let fixtureCounter = 0;

export function makeFlywheelEventInput(
  overrides: Partial<NewFlywheelEventInput> = {},
): NewFlywheelEventInput {
  fixtureCounter += 1;
  return {
    eventType: "SAVE",
    subjectKey: SUBJECT_A,
    itemId: `item-${fixtureCounter}`,
    occurredAt: TS,
    idempotencyKey: `idem-${fixtureCounter}`,
    payload: {},
    ...overrides,
  };
}

export function makeExperimentConfig(
  overrides: Partial<ExperimentConfigInput> = {},
): ExperimentConfigInput {
  fixtureCounter += 1;
  return {
    name: `experiment-${fixtureCounter}`,
    description: null,
    variants: [
      { key: "control", weight: 0.5 },
      { key: "treatment", weight: 0.5 },
    ],
    guardrailConfig: {
      maxOriginalityDeviation: 0.2,
      minDiversity: 0.3,
      maxAttributionViolations: 1,
    },
    ...overrides,
  };
}

export function makeRankingScore(
  overrides: Partial<RankingScoreRecord> = {},
): RankingScoreRecord {
  fixtureCounter += 1;
  return {
    itemId: `item-${fixtureCounter}`,
    rawScore: 10,
    decayedScore: 8,
    qualityScore: 0.8,
    recencyScore: 0.5,
    finalRankScore: 12,
    lastComputedAt: TS,
    ...overrides,
  };
}

export function makeSignalScore(
  overrides: Partial<SignalScoreRecord> = {},
): SignalScoreRecord {
  fixtureCounter += 1;
  return {
    patternSignalId: `signal-${fixtureCounter}`,
    suggestionStrength: 0.5,
    explanationReasonCode: "PATTERN_FREQUENCY",
    lastComputedAt: TS,
    ...overrides,
  };
}
