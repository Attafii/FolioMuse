import { z } from "zod";

// ── Safe projection contracts (T6) ────────────────────────────────────────
// Provenance-safe fields for gallery summaries and structural lessons.
// Imported from the provenance domain — single source of truth, no duplication.
// These contracts NEVER include contentBlob, structureJSON, raw captures,
// prompts, or claimant private evidence (ADR-0002 D7, policy §10.2).

export const ProvenanceSummarySchema = z
  .object({
    // Optional completeness signal: which provenance pieces are present.
    hasCreator: z.boolean(),
    hasSourceRecord: z.boolean(),
    hasAiProvenance: z.boolean(),
    hasConsent: z.boolean(),
    // AI involvement disclosure (policy §6): null when unknown/absent.
    aiDisclosure: z.enum(["HUMAN", "AI_ASSISTED", "AI_GENERATED", "UNKNOWN"]).nullable(),
    // Canonical creator identity (safe projection: name + verified status only).
    creator: z
      .object({
        id: z.string(),
        name: z.string(),
        verificationStatus: z.enum(["UNVERIFIED", "VERIFIED", "PENDING"]),
      })
      .nullable(),
    // Licence label + effective permission (derived, policy §5.2).
    licence: z
      .object({
        id: z.string(),
        effectivePermission: z.enum(["DISPLAY_ONLY", "PATTERN_DERIVE", "FULL"]),
      })
      .nullable(),
    // Source attribution (R3: attribution travels with content).
    source: z
      .object({
        sourceUrl: z.string().url(),
        canonicalUrl: z.string(),
        captureMode: z.enum(["MANUAL_SUBMISSION", "URL_SUBMISSION", "BROWSER_ASSIST"]),
        capturedAt: z.string().datetime({ message: "capturedAt must be an ISO 8601 datetime" }),
      })
      .nullable(),
    // Removal availability: a removal can be requested for this item.
    removalAvailable: z.boolean(),
  })
  .strict();
export type ProvenanceSummary = z.infer<typeof ProvenanceSummarySchema>;

// StructuralLesson: aggregated descriptors only (policy §10.1, ADR-0003 D8).
// Single source of truth lives in the provenance domain — re-exported here so
// curation consumers use the identical strict contract.
export { StructuralLessonSchema } from "@/domain/provenance/schemas";
export type { StructuralLesson } from "@/domain/provenance/schemas";

// ── Enum Schemas ────────────────────────────────────────────────────────

export const QualityLevelSchema = z.enum(["L0", "L1", "L2", "L3", "L4"]);
export type QualityLevel = z.infer<typeof QualityLevelSchema>;

export const ComplianceStatusSchema = z.enum(["PASS", "FLAG", "FAIL"]);
export type ComplianceStatus = z.infer<typeof ComplianceStatusSchema>;

export const ConsentTierSchema = z.enum(["DISPLAY", "PATTERN_DERIVE", "FULL"]);
export type ConsentTier = z.infer<typeof ConsentTierSchema>;

export const ConsentTermsSchema = z.enum([
  "CC_BY",
  "EXPLICIT_PERMISSION",
  "LICENSED",
]);
export type ConsentTerms = z.infer<typeof ConsentTermsSchema>;

export const ItemStatusSchema = z.enum([
  "PENDING_REVIEW",
  "ACCEPTED",
  "REJECTED",
  "PENDING_REREVIEW",
  "ARCHIVED",
  "SUSPENDED",
]);
export type ItemStatus = z.infer<typeof ItemStatusSchema>;

export const RejectionReasonSchema = z.enum([
  "QUALITY_BELOW_THRESHOLD",
  "COMPLIANCE_FAIL",
  "MISSING_CONSENT",
  "INCOMPLETE_ATTRIBUTION",
  "DUPLICATE",
  "CROSS_CLONE",
  "FABRICATED_CREDIBILITY",
  "STALE_CONTENT",
]);
export type RejectionReason = z.infer<typeof RejectionReasonSchema>;

export const AuditActionSchema = z.enum([
  "INGEST",
  "REVIEW",
  "ACCEPT",
  "REJECT",
  "ESCALATE",
  "OVERRIDE",
  "ARCHIVE",
  "SUSPEND",
  "CONSENT_REVOKE",
  "DUPLICATE_FLAG",
  "RE_REVIEW",
]);
export type AuditAction = z.infer<typeof AuditActionSchema>;

// ── Object Schemas ───────────────────────────────────────────────────────

export const AttributionSchema = z.object({
  creatorName: z.string().min(1, "creatorName must not be empty"),
  sourceUrl: z.string().url("sourceUrl must be a valid URL"),
  licenseType: ConsentTermsSchema,
  consentDate: z.string().datetime({ message: "consentDate must be an ISO 8601 datetime" }),
});
export type Attribution = z.infer<typeof AttributionSchema>;

export const ConsentRecordSchema = z.object({
  tier: ConsentTierSchema,
  consentedBy: z.string().min(1, "consentedBy must not be empty"),
  consentedAt: z.string().datetime({ message: "consentedAt must be an ISO 8601 datetime" }),
  terms: ConsentTermsSchema,
  expiresAt: z
    .string()
    .datetime({ message: "expiresAt must be an ISO 8601 datetime" })
    .nullable(),
});
export type ConsentRecord = z.infer<typeof ConsentRecordSchema>;

export const GalleryItemSummarySchema = z.object({
  id: z.string(),
  title: z.string(),
  creatorRole: z.string(),
  styleTags: z.array(z.string()),
  qualityLevel: QualityLevelSchema,
  complianceStatus: ComplianceStatusSchema,
  status: ItemStatusSchema,
  attribution: AttributionSchema,
  consentTier: ConsentTierSchema,
  reviewedAt: z
    .string()
    .datetime({ message: "reviewedAt must be an ISO 8601 datetime" })
    .nullable(),
  duplicateOfId: z.string().nullable(),
  // ADR-0003 safe projection extensions (T6): provenance completeness is
  // OPTIONAL on summaries (nullable rollout) but when present is validated.
  provenance: ProvenanceSummarySchema.optional(),
});
export type GalleryItemSummary = z.infer<typeof GalleryItemSummarySchema>;

export const ReviewDecisionSchema = z.object({
  itemId: z.string(),
  decision: z.enum(["ACCEPT", "REJECT"]),
  qualityLevel: QualityLevelSchema,
  complianceStatus: ComplianceStatusSchema,
  rejectionReason: RejectionReasonSchema.nullable(),
  rationale: z.string().min(1, "rationale must not be empty"),
  reviewerId: z.string().min(1, "reviewerId must not be empty"),
});
export type ReviewDecision = z.infer<typeof ReviewDecisionSchema>;

export const CurationTelemetryEventSchema = z.object({
  action: AuditActionSchema,
  itemId: z.string(),
  actorId: z.string(),
  decision: z.string().nullable(),
  rationale: z.string().nullable(),
  timestamp: z.string().datetime({ message: "timestamp must be an ISO 8601 datetime" }),
});
export type CurationTelemetryEvent = z.infer<typeof CurationTelemetryEventSchema>;
