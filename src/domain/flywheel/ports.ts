// ─── Flywheel Port Interfaces (ADR-0004) ─────────────────────────────────
// Framework-agnostic domain interfaces. Implementations live in
// src/persistence/ and MUST NOT be imported by UI code (AGENTS.md §7).
// NO Prisma/Next imports — these are pure TypeScript interfaces.
//
// Design rules:
// - Read methods return SAFE domain records (rank metadata only — never
//   content blobs, raw captures, or source URLs beyond canonical metadata).
// - Writes are explicit commands with narrow shapes (provenance port style).
// - Event history is append-only + idempotent by idempotencyKey (ADR-0004 D1).
// - NO generic CRUD, NO update/delete path for behavior events.

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
} from "./types";

// ─── FlywheelEventRepository ──────────────────────────────────────────────
// Append-only event storage. recordEvent MUST be idempotent: re-recording
// with the same idempotencyKey returns the existing record, never duplicates.

export interface FlywheelEventRepository {
  recordEvent(input: NewFlywheelEventInput): Promise<FlywheelEvent>;
  findEventByIdempotencyKey(idempotencyKey: string): Promise<FlywheelEvent | null>;
  listEvents(filter: FlywheelEventFilter): Promise<FlywheelEvent[]>;
  // NO update()/delete() — append-only by contract (ADR-0004 D1).
}

// ─── RankingStore ─────────────────────────────────────────────────────────
// Persisted ranking/suggestion scores (rank metadata only).

export interface RankingStore {
  saveRankingScore(score: RankingScoreRecord): Promise<void>;
  listRankingScores(): Promise<RankingScoreRecord[]>;
  saveSignalScore(score: SignalScoreRecord): Promise<void>;
  listSignalScores(): Promise<SignalScoreRecord[]>;
}

// ─── ExperimentRegistry ───────────────────────────────────────────────────
// Deterministic A/B experiment registry (ADR-0004 D4). assignVariant MUST
// be deterministic: same (experimentId, subjectKey) → same variant.

export interface ExperimentRegistry {
  registerExperiment(config: ExperimentConfigInput): Promise<ExperimentRecord>;
  getExperiment(id: string): Promise<ExperimentRecord | null>;
  assignVariant(
    experimentId: string,
    subjectKey: string,
  ): Promise<ExperimentAssignmentRecord>;
  listExperiments(): Promise<ExperimentRecord[]>;
}

// ─── Clock ────────────────────────────────────────────────────────────────
// Injectable time source so domain logic is deterministic and testable.

export interface FlywheelClock {
  now(): string; // ISO 8601 datetime
}

// ─── FlywheelTelemetry ────────────────────────────────────────────────────
// Privacy-minimized structured events (ADR-0004 D7/D8): ids/enums/counts
// only. NEVER payload content. Implementations never throw.

export interface FlywheelTelemetry {
  emit(event: FlywheelTelemetryEvent): void;
}
