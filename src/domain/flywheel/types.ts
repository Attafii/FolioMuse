// ─── Flywheel Type Unions (ADR-0004) ─────────────────────────────────────
// Behavior-flywheel domain types. Definitive source of enum values:
// docs/adr/0004-data-flywheel-and-ranking-feedback.md. Where z.infer
// suffices, prefer z.infer in schemas.ts over manual types.

// ─── Event Types ──────────────────────────────────────────────────────────

export type FlywheelEventType =
  | "IMPRESSION"
  | "OPEN"
  | "SAVE"
  | "COLLECTION_ADD"
  | "MCP_RETRIEVAL_USE"
  | "DISMISSAL"
  | "REFORMULATION"
  | "MODERATOR_ACCEPTANCE";

// ─── Event Payload ────────────────────────────────────────────────────────
// Privacy-minimized metadata only (ADR-0002 D7, ADR-0004 D7/D8): flat
// primitives, no nested objects, no content blobs/URLs/prompts/evidence.

export type FlywheelEventPayload = Record<string, string | number | boolean>;

// ─── Domain Records ───────────────────────────────────────────────────────

export interface FlywheelEvent {
  id: string;
  eventType: FlywheelEventType;
  // Hashed subject key (SHA-256 hex) — NEVER a raw user identifier (ADR-0004 D1).
  subjectKey: string;
  itemId: string | null;
  patternSignalId: string | null;
  experimentId: string | null;
  variant: string | null;
  occurredAt: string; // ISO 8601 datetime
  idempotencyKey: string;
  payload: FlywheelEventPayload;
  createdAt: string; // ISO 8601 datetime
}

export interface NewFlywheelEventInput {
  eventType: FlywheelEventType;
  subjectKey: string;
  itemId?: string | null;
  patternSignalId?: string | null;
  experimentId?: string | null;
  variant?: string | null;
  occurredAt: string; // ISO 8601 datetime
  idempotencyKey: string;
  payload?: FlywheelEventPayload;
}

export interface FlywheelEventFilter {
  eventType?: FlywheelEventType;
  itemId?: string;
  patternSignalId?: string;
  subjectKey?: string;
  since?: string; // ISO 8601 datetime (inclusive lower bound on occurredAt)
  until?: string; // ISO 8601 datetime (exclusive upper bound on occurredAt)
}

// ─── Explanation Reason Codes (ADR-0004 D5) ───────────────────────────────
// Provenance-anchored reasons for every ranking/suggestion decision (R7:
// users must see WHY). Never exposes raw popularity as a reason.

export type ExplanationReasonCode =
  | "QUALITY"
  | "RECENT"
  | "DIVERSITY"
  | "SAVED_SIMILARITY"
  | "PATTERN_FREQUENCY"
  | "EXPERIMENT_ARM"
  | "MODERATOR_APPROVED";

// ─── Ranking (Gallery Items) ──────────────────────────────────────────────

export interface RankableItem {
  id: string;
  title: string | null;
  creatorId: string;
  creatorName: string;
  status: "ACCEPTED" | "REJECTED" | "SUSPENDED" | "PENDING_REVIEW";
  qualityScore: number; // 0..1 normalized
  acceptedAt: string; // ISO 8601 datetime
}

export interface RankingParams {
  // Blend weights (sum need not equal 1; normalized internally).
  wQuality: number;
  wRecency: number;
  wUtility: number;
  // Saturation decay (ADR-0004 D2): utility contribution halves per
  // log(2)/lambda days of item age.
  saturationLambda: number;
  // Per-creator exposure cap in the top-N (ADR-0004 D3).
  maxItemsPerCreator: number;
  // Ranked list size.
  topN: number;
}

export interface RankingResult {
  itemId: string;
  title: string | null;
  creatorId: string;
  creatorName: string;
  qualityScore: number;
  recencyScore: number;
  utilityScore: number;
  finalRankScore: number;
  explanationReasonCode: ExplanationReasonCode;
}

export interface RankingScoreRecord {
  itemId: string;
  rawScore: number;
  decayedScore: number;
  qualityScore: number;
  recencyScore: number;
  finalRankScore: number;
  lastComputedAt: string; // ISO 8601 datetime
}

// ─── Suggestion Strength (PatternSignals) ─────────────────────────────────

export interface PatternSignalRecord {
  id: string;
  patternType: string;
  eligibleItemCount: number;
  distinctCreatorCount: number;
}

export interface SuggestionParams {
  // R2 floor (ADR-0003 D8): >=3 eligible items AND >=2 distinct creators.
  minEligibleItems: number;
  minDistinctCreators: number;
  // Behavior uplift bounds (ADR-0004 D2/D3): bounded so a single popular
  // pattern cannot dominate the suggestion set.
  maxUplift: number;
  maxSuggestionStrength: number;
}

export interface SignalScoreRecord {
  patternSignalId: string;
  suggestionStrength: number;
  explanationReasonCode: ExplanationReasonCode;
  lastComputedAt: string; // ISO 8601 datetime
}

// ─── Experiments (ADR-0004 D4) ────────────────────────────────────────────

export type ExperimentStatus = "DRAFT" | "RUNNING" | "PAUSED" | "COMPLETED";

export interface ExperimentVariant {
  key: string;
  weight: number; // 0..1; weights across variants must sum to 1
}

export interface ExperimentGuardrails {
  maxOriginalityDeviation: number;
  minDiversity: number;
  maxAttributionViolations: number;
}

export interface ExperimentRecord {
  id: string;
  name: string;
  description: string | null;
  status: ExperimentStatus;
  variants: ExperimentVariant[];
  guardrailConfig: ExperimentGuardrails;
  startedAt: string | null; // ISO 8601 datetime
  endedAt: string | null; // ISO 8601 datetime
  createdAt: string; // ISO 8601 datetime
}

export interface ExperimentConfigInput {
  name: string;
  description?: string | null;
  variants: ExperimentVariant[];
  guardrailConfig: ExperimentGuardrails;
}

export interface ExperimentAssignmentRecord {
  id: string;
  experimentId: string;
  subjectKey: string; // hashed (SHA-256 hex)
  variant: string;
  assignedAt: string; // ISO 8601 datetime
}

export interface GuardrailEvaluation {
  experimentId: string;
  recommendation: "RUNNING" | "PAUSED";
  breached: string[]; // guardrail names that were breached (empty when RUNNING)
}

// ─── Telemetry Payloads (ADR-0004 D7/D8) ──────────────────────────────────
// Privacy-minimized: ids/enums/counts only. NEVER payload content.

export type FlywheelTelemetryEvent =
  | { type: "EVENT_INGESTED"; eventType: FlywheelEventType; timestamp: string }
  | { type: "EVENT_VALIDATION_FAILED"; reason: string; timestamp: string }
  | { type: "EVENT_DEDUPED"; idempotencyKey: string; timestamp: string }
  | { type: "RANKING_COMPUTED"; itemCount: number; timestamp: string }
  | { type: "RANKING_ELIGIBILITY_EXCLUDED"; itemCount: number; timestamp: string }
  | { type: "SUGGESTIONS_ADJUSTED"; signalCount: number; timestamp: string }
  | { type: "EXPERIMENT_REGISTERED"; experimentId: string; timestamp: string }
  | { type: "EXPERIMENT_ASSIGNED"; experimentId: string; variant: string; timestamp: string }
  | { type: "GUARDRAIL_BREACH"; experimentId: string; breached: string[]; timestamp: string };
