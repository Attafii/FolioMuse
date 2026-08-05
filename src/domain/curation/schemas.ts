import { z } from "zod";

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
