// ─── Type Unions ───────────────────────────────────────────────────────────────────
// These align with zod enums in schemas.ts (Task 6).
// NOTE FOR T6/T7 RECONCILIATION: if schemas.ts defines these as zod enums with
// different literal values, reconcile the types to match. The definitive source
// of enum values is the curation rubric (docs/product/curation-rubric.md).

export type QualityLevel = "L0" | "L1" | "L2" | "L3" | "L4";

export type ComplianceStatus = "PASS" | "FLAG" | "FAIL";

export type ConsentTier = "DISPLAY" | "PATTERN_DERIVE" | "FULL";

export type ConsentTerms = "CC_BY" | "EXPLICIT_PERMISSION" | "LICENSED";

export type ItemStatus =
  | "PENDING_REVIEW"
  | "ACCEPTED"
  | "REJECTED"
  | "PENDING_REREVIEW"
  | "ARCHIVED"
  | "SUSPENDED";

export type RejectionReason =
  | "QUALITY_BELOW_THRESHOLD"
  | "COMPLIANCE_FAIL"
  | "MISSING_CONSENT"
  | "INCOMPLETE_ATTRIBUTION"
  | "DUPLICATE"
  | "CROSS_CLONE"
  | "FABRICATED_CREDIBILITY"
  | "STALE_CONTENT";

export type AuditAction =
  | "INGEST"
  | "REVIEW"
  | "ACCEPT"
  | "REJECT"
  | "ESCALATE"
  | "OVERRIDE"
  | "ARCHIVE"
  | "SUSPEND"
  | "CONSENT_REVOKE"
  | "DUPLICATE_FLAG"
  | "RE_REVIEW";

// ─── Domain Interfaces ────────────────────────────────────────────────────────────

export interface Attribution {
  creatorName: string;
  sourceUrl: string;
  licenseType: ConsentTerms;
  consentDate: string; // ISO 8601 datetime
}

export interface ConsentRecord {
  tier: ConsentTier;
  consentedBy: string;
  consentedAt: string; // ISO 8601 datetime
  terms: ConsentTerms;
  expiresAt: string | null; // ISO 8601 datetime, null = no expiry
}

export interface GalleryItemSummary {
  id: string;
  title: string;
  creatorRole: string;
  styleTags: string[];
  qualityLevel: QualityLevel;
  complianceStatus: ComplianceStatus;
  status: ItemStatus;
  attribution: Attribution;
  consentTier: ConsentTier;
  reviewedAt: string | null;
  duplicateOfId: string | null;
  // Portfolio card system (T1): curated external screenshot + stack metadata.
  // Safe projection only - never content, raw captures, or provenance evidence.
  mediaUrl: string | null;
  // Verified open-source source repository, when known (null otherwise).
  githubUrl?: string | null;
  stackTags: string[];
  // ADR-0003 T6 safe projection: optional provenance completeness summary.
  // NEVER carries contentBlob/structureJSON/raw captures/claimant evidence.
  provenance?: ProvenanceSummary;
}

// ─── Safe Projection Types (ADR-0003 T6) ─────────────────────────────────
// Safe gallery/API/MCP projection fields. Type is inferred from the Zod
// schema in src/domain/curation/schemas.ts (single source of truth —
// no manual duplication per T4 rule).

import type { ProvenanceSummary } from "@/domain/curation/schemas";

/**
 * Internal gallery detail record for /gallery/[id] (ADR-0007 T5).
 * Service-layer only — NEVER returned by a public API/UI directly. Carries
 * the safe summary fields plus the provenance linkage needed for enrichment
 * (sourceRecordId, aiProvenanceId) and the consent revocation guard
 * (consentRevokedAt). Never carries contentBlob/structureJSON/raw captures.
 */
export interface GalleryDetailRecord {
  id: string;
  title: string;
  creatorRole: string;
  styleTags: string[];
  qualityLevel: QualityLevel;
  complianceStatus: ComplianceStatus;
  status: ItemStatus;
  attribution: Attribution;
  consentTier: ConsentTier;
  consentRevokedAt: string | null;
  reviewedAt: string | null;
  duplicateOfId: string | null;
  mediaUrl: string | null;
  stackTags: string[];
  desktopMediaUrl: string | null;
  mobileMediaUrl: string | null;
  githubUrl: string | null;
  pageIndex: string[];
  sections: unknown;
  strengths: unknown;
  stackEvidence: unknown;
  sourceRecordId: string | null;
  aiProvenanceId: string | null;
}

export interface ReviewDecision {
  itemId: string;
  decision: "ACCEPT" | "REJECT";
  qualityLevel: QualityLevel;
  complianceStatus: ComplianceStatus;
  rejectionReason: RejectionReason | null;
  rationale: string;
  reviewerId: string;
}

export interface AuditEntry {
  id: string;
  action: AuditAction;
  actorId: string;
  itemId: string | null;
  decision: string | null;
  rationale: string | null;
  timestamp: string; // ISO 8601 datetime
}

export interface CurationTelemetryEvent {
  action: AuditAction;
  itemId: string;
  actorId: string;
  decision: string | null;
  rationale: string | null;
  timestamp: string; // ISO 8601 datetime
}

// ─── Entities ──────────────────────────────────────────────────────────────────────
// GalleryItem is the full internal entity used by the repository.
// Domain interfaces return GalleryItemSummary, never the full entity.

export interface GalleryItem {
  id: string;
  title: string;
  creatorRole: string;
  styleTags: string[];
  qualityLevel: QualityLevel;
  complianceStatus: ComplianceStatus;
  status: ItemStatus;
  attributionId: string; // non-nullable FK
  consentRecordId: string; // non-nullable FK
  attribution: Attribution;
  consent: ConsentRecord;
  reviewedAt: string | null;
  duplicateOfId: string | null;
  structureFingerprint: string | null; // placeholder per R8
  contentHash: string | null; // placeholder per R8
  mediaUrl: string | null; // portfolio card system (T1): curated external screenshot
  stackTags: string[]; // portfolio card system (T1): bounded stack metadata
  createdAt: string; // ISO 8601 datetime
  updatedAt: string; // ISO 8601 datetime
}

// ─── Input Types ───────────────────────────────────────────────────────────────────

export interface NewGalleryItemInput {
  title: string;
  creatorRole: string;
  styleTags: string[];
  attribution: Attribution;
  consent: ConsentRecord;
  // Portfolio card system (T1): optional curated metadata at ingest time.
  mediaUrl?: string | null;
  stackTags?: string[];
}

export interface UpdateGalleryItemInput {
  title?: string;
  creatorRole?: string;
  styleTags?: string[];
  duplicateOfId?: string | null;
  qualityLevel?: QualityLevel;
  complianceStatus?: ComplianceStatus;
  status?: ItemStatus;
  reviewedAt?: string | null;
  // Portfolio card system (T1): curated metadata is editable, attribution is not.
  mediaUrl?: string | null;
  stackTags?: string[];
  // NOTE: attributionId, consentRecordId, creatorName, sourceUrl, licenseType,
  // consentDate, consent, and attribution fields are intentionally absent.
  // GalleryRepository.update() MUST reject any attempt to modify attribution
  // (R3 guard). The implementation checks for these fields and throws
  // AttributionModificationError.
}

export interface IngestInput {
  title: string;
  creatorRole: string;
  styleTags: string[];
  attribution: Attribution;
  consent: ConsentRecord;
  // Portfolio card system (T5): optional curated metadata at ingest time.
  mediaUrl?: string | null;
  stackTags?: string[];
}

export interface ReviewDecisionInput {
  itemId: string;
  decision: "ACCEPT" | "REJECT";
  qualityLevel: QualityLevel;
  complianceStatus: ComplianceStatus;
  rejectionReason: RejectionReason | null;
  rationale: string;
  reviewerId: string;
}

export interface OverrideDecisionInput {
  finalDecision: "ACCEPT" | "REJECT";
  qualityLevel: QualityLevel;
  complianceStatus: ComplianceStatus;
  rejectionReason: RejectionReason | null;
  rationale: string;
}

export interface NewAuditEntryInput {
  action: AuditAction;
  actorId: string;
  itemId: string;
  decision?: string | null;
  rationale?: string | null;
}

// ─── Errors ────────────────────────────────────────────────────────────────────────
// R3 guard: attribution must not be strippable. Any update that modifies
// attribution fields throws this error.

export class AttributionModificationError extends Error {
  constructor(
    public readonly itemId: string,
    public readonly attemptedFields: string[],
  ) {
    const fieldList = attemptedFields.join(", ");
    super(
      `Cannot modify attribution for gallery item ${itemId}. ` +
        `Attempted to change attribution fields: ${fieldList}. ` +
        `Attribution is immutable per originality rule R3.`,
    );
    this.name = "AttributionModificationError";
  }
}
