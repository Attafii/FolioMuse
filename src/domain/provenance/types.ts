// ─── Provenance Type Unions (ADR-0003 / policy §1–§13) ───────────────────
// NOTE: definitive source of enum values is the provenance policy
// (docs/product/provenance-and-originality-policy.md) and ADR-0003.
// Where z.infer suffices, prefer z.infer in schemas.ts over manual types.

export type CaptureMode =
  | "MANUAL_SUBMISSION"
  | "URL_SUBMISSION"
  | "BROWSER_ASSIST";

// Deferred modes (policy §2.1) — declared but not implementable yet:
// "CRAWLER", "API_PARTNER"

export type DisclosureStatus = "HUMAN" | "AI_ASSISTED" | "AI_GENERATED" | "UNKNOWN";

export type LicenceId =
  // Creative Commons
  | "CC_BY"
  | "CC_BY_SA"
  | "CC_BY_NC"
  | "CC_BY_NC_SA"
  | "CC_BY_ND"
  | "CC_BY_NC_ND"
  | "CC0"
  | "PDM"
  // SPDX-compatible
  | "MIT"
  | "Apache-2.0"
  | "BSD-3-Clause"
  | "UNLICENSED";

export type PermissionResult = "DISPLAY_ONLY" | "PATTERN_DERIVE" | "FULL";

export type ClaimStatus =
  | "PENDING"
  | "UNDER_REVIEW"
  | "ACCEPTED"
  | "REJECTED"
  | "WITHDRAWN";

export type RemovalStatus = "REQUESTED" | "EFFECTIVE" | "COMPLETED";

export type RebuildState =
  | "STALE_PENDING_REBUILD"
  | "REBUILDING"
  | "ACTIVE"
  | "REBUILD_FAILED"
  | "DROPPED_BELOW_FLOOR";

export type CreatorVerificationStatus = "UNVERIFIED" | "VERIFIED" | "PENDING";

export type ClaimDisposition = "ACCEPTED" | "REJECTED" | "WITHDRAWN";

// ─── Domain Records ────────────────────────────────────────────────────────

export interface CreatorRecord {
  id: string;
  name: string;
  url: string | null;
  verificationStatus: CreatorVerificationStatus;
  createdAt: string; // ISO 8601 datetime
}

export interface SourceRecord {
  id: string;
  sourceUrl: string;
  canonicalUrl: string;
  captureMode: CaptureMode;
  capturedAt: string; // ISO 8601 datetime
  evidenceHash: string | null;
  creatorId: string | null;
  createdAt: string; // ISO 8601 datetime
}

export interface AiProvenanceRecord {
  id: string;
  provider: string;
  modelName: string;
  generatedAt: string; // ISO 8601 datetime
  disclosureStatus: DisclosureStatus;
  promptHash: string | null;
  outputHash: string | null;
  createdAt: string; // ISO 8601 datetime
}

export interface OwnershipClaimRecord {
  id: string;
  itemId: string;
  claimantName: string;
  // NOTE: claimantContact is private (policy §8.3) — never exposed in
  // public projections or telemetry; present on the internal record only.
  claimantContact: string;
  status: ClaimStatus;
  submittedAt: string;
  resolvedAt: string | null;
  resolvedBy: string | null;
  resolution: string | null;
  creatorId: string | null;
  createdAt: string;
}

export interface RemovalRecord {
  id: string;
  itemId: string;
  status: RemovalStatus;
  requestedBy: string;
  reason: string;
  requestedAt: string;
  effectiveAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

export interface PatternSignalState {
  id: string;
  derivedFromItemIds: string[];
  patternType: string;
  staleSince: string | null;
  eligibleItemCount: number | null;
  distinctCreatorCount: number | null;
  rebuildState: RebuildState | null;
  createdAt: string;
}

// ─── Safe Structural Lesson (policy §10.1) ─────────────────────────────────
// Aggregated, anonymized output — never a single source's expression.

export interface StructuralLesson {
  patternType: string;
  sourceItemCount: number; // >= 3
  distinctCreatorCount: number; // >= 2
  // Aggregate descriptors only: counts/distributions over eligible items.
  sectionFrequency: Record<string, number>;
  commonTags: string[];
  averageSectionCount: number | null;
}

// ─── Telemetry Payloads (policy §12) ────────────────────────────────────────

export type ProvenanceTelemetryEvent =
  | { type: "INCOMPLETE_PROVENANCE"; itemId: string; missing: string[]; timestamp: string }
  | { type: "PROHIBITED_EXPORT_ATTEMPT"; reason: string; timestamp: string }
  | { type: "CLAIM_CREATED"; claimId: string; itemId: string; timestamp: string }
  | { type: "CLAIM_RESOLVED"; claimId: string; itemId: string; status: ClaimStatus; timestamp: string }
  | { type: "REMOVAL_REQUESTED"; removalId: string; itemId: string; timestamp: string }
  | { type: "REMOVAL_EFFECTIVE"; removalId: string; itemId: string; timestamp: string }
  | { type: "CONSENT_REVOKED"; itemId: string; timestamp: string }
  | { type: "PATTERN_INVALIDATED"; signalId: string; timestamp: string }
  | { type: "REBUILD_SUCCESS"; signalId: string; timestamp: string }
  | { type: "REBUILD_FAILED"; signalId: string; timestamp: string }
  | { type: "REBUILD_BELOW_FLOOR"; signalId: string; itemCount: number; creatorCount: number; timestamp: string };

// ─── Superseding Assertion (policy §7.2 / ADR-0003 D5) ─────────────────────
// Attribution corrections create a new assertion that supersedes the old;
// historical records are never mutated.

export interface SupersedingAssertion {
  id: string;
  targetItemId: string;
  replacesAssertionId: string;
  correctedCreatorId: string | null;
  correctedLicenseType: LicenceId | null;
  rationale: string;
  recordedBy: string;
  recordedAt: string; // ISO 8601 datetime
}

// ─── Inputs ────────────────────────────────────────────────────────────────

export interface NewCreatorInput {
  name: string;
  url?: string | null;
}

export interface NewSourceRecordInput {
  sourceUrl: string;
  canonicalUrl: string;
  captureMode: CaptureMode;
  capturedAt: string;
  evidenceHash?: string | null;
  creatorId?: string | null;
}

export interface NewAiProvenanceInput {
  provider: string;
  modelName: string;
  generatedAt: string;
  disclosureStatus: DisclosureStatus;
  promptHash?: string | null;
  outputHash?: string | null;
}

export interface FileOwnershipClaimInput {
  itemId: string;
  claimantName: string;
  claimantContact: string;
  creatorId?: string | null;
}

export interface ResolveOwnershipClaimInput {
  claimId: string;
  decision: "ACCEPTED" | "REJECTED";
  resolvedBy: string;
  resolution: string;
}

export interface RequestRemovalInput {
  itemId: string;
  requestedBy: string;
  reason: string;
}

export interface SupersedeAttributionInput {
  targetItemId: string;
  replacesAssertionId: string;
  correctedCreatorId?: string | null;
  correctedLicenseType?: LicenceId | null;
  rationale: string;
  recordedBy: string;
}
