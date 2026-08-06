import { z } from "zod";

// ── Enum Schemas ────────────────────────────────────────────────────────

export const CaptureModeSchema = z.enum([
  "MANUAL_SUBMISSION",
  "URL_SUBMISSION",
  "BROWSER_ASSIST",
]);
export type CaptureMode = z.infer<typeof CaptureModeSchema>;

export const DisclosureStatusSchema = z.enum([
  "HUMAN",
  "AI_ASSISTED",
  "AI_GENERATED",
  "UNKNOWN",
]);
export type DisclosureStatus = z.infer<typeof DisclosureStatusSchema>;

export const LicenceIdSchema = z.enum([
  "CC_BY",
  "CC_BY_SA",
  "CC_BY_NC",
  "CC_BY_NC_SA",
  "CC_BY_ND",
  "CC_BY_NC_ND",
  "CC0",
  "PDM",
  "MIT",
  "Apache-2.0",
  "BSD-3-Clause",
  "UNLICENSED",
]);
export type LicenceId = z.infer<typeof LicenceIdSchema>;

// Licences that prohibit derivation (ND / NC-ND / PDM no-derivatives posture
// per policy §5.2). ND and NC_ND never permit derivation.
export const NoDerivativesLicences = new Set<LicenceId>([
  "CC_BY_ND",
  "CC_BY_NC_ND",
]);

// NonCommercial licences: display-only until FolioMuse's commercial posture
// is decided (policy §5.2, ADR-0003 open question 1).
export const NonCommercialLicences = new Set<LicenceId>([
  "CC_BY_NC",
  "CC_BY_NC_SA",
  "CC_BY_NC_ND",
]);

export const PermissionResultSchema = z.enum([
  "DISPLAY_ONLY",
  "PATTERN_DERIVE",
  "FULL",
]);
export type PermissionResult = z.infer<typeof PermissionResultSchema>;

export const ClaimStatusSchema = z.enum([
  "PENDING",
  "UNDER_REVIEW",
  "ACCEPTED",
  "REJECTED",
  "WITHDRAWN",
]);
export type ClaimStatus = z.infer<typeof ClaimStatusSchema>;

export const RemovalStatusSchema = z.enum(["REQUESTED", "EFFECTIVE", "COMPLETED"]);
export type RemovalStatus = z.infer<typeof RemovalStatusSchema>;

export const RebuildStateSchema = z.enum([
  "STALE_PENDING_REBUILD",
  "REBUILDING",
  "ACTIVE",
  "REBUILD_FAILED",
  "DROPPED_BELOW_FLOOR",
]);
export type RebuildState = z.infer<typeof RebuildStateSchema>;

export const CreatorVerificationStatusSchema = z.enum([
  "UNVERIFIED",
  "VERIFIED",
  "PENDING",
]);
export type CreatorVerificationStatus = z.infer<typeof CreatorVerificationStatusSchema>;

// ── Shared Primitives ────────────────────────────────────────────────────

export const IsoDatetimeSchema = z
  .string()
  .datetime({ message: "must be an ISO 8601 datetime" });

// SHA-256 hex digest (64 lowercase hex chars) or sha256 with prefix.
export const HashSchema = z
  .string()
  .regex(/^(sha256:)?[a-f0-9]{64}$/, {
    message: "must be a SHA-256 hex digest (64 hex chars, optional sha256: prefix)",
  })
  .nullable();

export const SourceUrlSchema = z
  .string()
  .url("sourceUrl must be a valid URL")
  .refine((u) => {
    try {
      const scheme = new URL(u).protocol;
      // Strict scheme allowlist (policy §2.3): https primary; http allowed
      // only for redirect targets. Credentials and dangerous schemes rejected.
      return scheme === "https:" || scheme === "http:";
    } catch {
      return false;
    }
  }, "sourceUrl must use https (or http for redirects) and carry no credentials")
  .refine((u) => {
    try {
      return new URL(u).username === "" && new URL(u).password === "";
    } catch {
      return false;
    }
  }, "sourceUrl must not embed credentials");

// ── Object Schemas ───────────────────────────────────────────────────────

export const CreatorRecordSchema = z
  .object({
    id: z.string(),
    name: z.string().min(1, "creator name must not be empty").max(200),
    url: z.string().url("creator url must be valid").nullable(),
    verificationStatus: CreatorVerificationStatusSchema,
    createdAt: IsoDatetimeSchema,
  })
  .strict();

export const NewCreatorInputSchema = z
  .object({
    name: z.string().min(1, "creator name must not be empty").max(200),
    url: z.string().url("creator url must be valid").nullable().optional(),
  })
  .strict();

export const SourceRecordSchema = z
  .object({
    id: z.string(),
    sourceUrl: SourceUrlSchema,
    canonicalUrl: z.string().min(1, "canonicalUrl must not be empty").max(2000),
    captureMode: CaptureModeSchema,
    capturedAt: IsoDatetimeSchema,
    evidenceHash: HashSchema,
    creatorId: z.string().nullable(),
    createdAt: IsoDatetimeSchema,
  })
  .strict();

export const NewSourceRecordInputSchema = z
  .object({
    sourceUrl: SourceUrlSchema,
    canonicalUrl: z.string().min(1, "canonicalUrl must not be empty").max(2000),
    captureMode: CaptureModeSchema,
    capturedAt: IsoDatetimeSchema,
    evidenceHash: HashSchema.optional(),
    creatorId: z.string().nullable().optional(),
  })
  .strict();

export const AiProvenanceRecordSchema = z
  .object({
    id: z.string(),
    provider: z.string().min(1, "provider must not be empty").max(200),
    modelName: z.string().min(1, "modelName must not be empty").max(200),
    generatedAt: IsoDatetimeSchema,
    disclosureStatus: DisclosureStatusSchema,
    promptHash: HashSchema,
    outputHash: HashSchema,
    createdAt: IsoDatetimeSchema,
  })
  .strict();

export const NewAiProvenanceInputSchema = z
  .object({
    provider: z.string().min(1, "provider must not be empty").max(200),
    modelName: z.string().min(1, "modelName must not be empty").max(200),
    generatedAt: IsoDatetimeSchema,
    // Mandatory disclosure: MISSING or UNKNOWN is rejected for new inputs
    // (policy §6.1 — missing AI disclosure is a compliance failure).
    disclosureStatus: DisclosureStatusSchema.refine(
      (v) => v !== "UNKNOWN",
      "disclosureStatus must be HUMAN, AI_ASSISTED, or AI_GENERATED for new records",
    ),
    promptHash: HashSchema.optional(),
    outputHash: HashSchema.optional(),
  })
  .strict();

export const OwnershipClaimRecordSchema = z
  .object({
    id: z.string(),
    itemId: z.string(),
    claimantName: z.string().min(1).max(200),
    // Private field — internal record only; never in public projections.
    claimantContact: z.string().min(1).max(500),
    status: ClaimStatusSchema,
    submittedAt: IsoDatetimeSchema,
    resolvedAt: IsoDatetimeSchema.nullable(),
    resolvedBy: z.string().nullable(),
    resolution: z.string().nullable(),
    creatorId: z.string().nullable(),
    createdAt: IsoDatetimeSchema,
  })
  .strict()
  .superRefine((claim, ctx) => {
    // Cross-field: terminal states require resolution metadata (policy §8.1).
    if (claim.status === "ACCEPTED" || claim.status === "REJECTED") {
      if (!claim.resolvedAt || !claim.resolvedBy || !claim.resolution) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["resolvedAt"],
          message:
            "ACCEPTED/REJECTED claims must carry resolvedAt, resolvedBy, and resolution",
        });
      }
    }
  });

export const FileOwnershipClaimInputSchema = z
  .object({
    itemId: z.string(),
    claimantName: z.string().min(1).max(200),
    claimantContact: z.string().min(1).max(500),
    creatorId: z.string().nullable().optional(),
  })
  .strict();

export const ResolveOwnershipClaimInputSchema = z
  .object({
    claimId: z.string(),
    decision: z.enum(["ACCEPTED", "REJECTED"]),
    resolvedBy: z.string().min(1).max(200),
    resolution: z.string().min(1).max(2000),
  })
  .strict();

export const RemovalRecordSchema = z
  .object({
    id: z.string(),
    itemId: z.string(),
    status: RemovalStatusSchema,
    requestedBy: z.string().min(1).max(200),
    reason: z.string().min(1).max(2000),
    requestedAt: IsoDatetimeSchema,
    effectiveAt: IsoDatetimeSchema.nullable(),
    completedAt: IsoDatetimeSchema.nullable(),
    createdAt: IsoDatetimeSchema,
  })
  .strict()
  .superRefine((removal, ctx) => {
    // Cross-field: EFFECTIVE requires effectiveAt; COMPLETED requires both.
    if (removal.status === "EFFECTIVE" && !removal.effectiveAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["effectiveAt"],
        message: "EFFECTIVE removals must carry effectiveAt",
      });
    }
    if (removal.status === "COMPLETED" && (!removal.effectiveAt || !removal.completedAt)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["completedAt"],
        message: "COMPLETED removals must carry effectiveAt and completedAt",
      });
    }
    // Illegal transition guard: COMPLETED without prior EFFECTIVE is invalid.
    if (removal.status === "COMPLETED" && removal.effectiveAt && removal.completedAt) {
      if (new Date(removal.completedAt).getTime() < new Date(removal.effectiveAt).getTime()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["completedAt"],
          message: "completedAt must not precede effectiveAt",
        });
      }
    }
  });

export const RequestRemovalInputSchema = z
  .object({
    itemId: z.string(),
    requestedBy: z.string().min(1).max(200),
    reason: z.string().min(1).max(2000),
  })
  .strict();

export const PatternSignalStateSchema = z
  .object({
    id: z.string(),
    derivedFromItemIds: z.array(z.string()).max(1000),
    patternType: z.string().min(1).max(200),
    staleSince: IsoDatetimeSchema.nullable(),
    eligibleItemCount: z.number().int().min(0).nullable(),
    distinctCreatorCount: z.number().int().min(0).nullable(),
    rebuildState: RebuildStateSchema.nullable(),
    createdAt: IsoDatetimeSchema,
  })
  .strict();

// R2 floor per ADR-0003 D8 / policy §10.1: >=3 eligible items AND >=2 creators.
export const R2_MIN_ELIGIBLE_ITEMS = 3;
export const R2_MIN_DISTINCT_CREATORS = 2;

export const StructuralLessonSchema = z
  .object({
    patternType: z.string().min(1).max(200),
    sourceItemCount: z
      .number()
      .int()
      .min(R2_MIN_ELIGIBLE_ITEMS, `must aggregate at least ${R2_MIN_ELIGIBLE_ITEMS} eligible source items`),
    distinctCreatorCount: z
      .number()
      .int()
      .min(R2_MIN_DISTINCT_CREATORS, `must aggregate at least ${R2_MIN_DISTINCT_CREATORS} distinct creators`),
    sectionFrequency: z.record(z.string(), z.number().int().min(0)),
    commonTags: z.array(z.string()).max(100),
    averageSectionCount: z.number().min(0).nullable(),
  })
  .strict();
export type StructuralLesson = z.infer<typeof StructuralLessonSchema>;

export const ProvenanceTelemetryEventSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("INCOMPLETE_PROVENANCE"),
    itemId: z.string(),
    missing: z.array(z.string()).min(1),
    timestamp: IsoDatetimeSchema,
  }).strict(),
  z.object({
    type: z.literal("PROHIBITED_EXPORT_ATTEMPT"),
    reason: z.string().min(1),
    timestamp: IsoDatetimeSchema,
  }).strict(),
  z.object({
    type: z.literal("CLAIM_CREATED"),
    claimId: z.string(),
    itemId: z.string(),
    timestamp: IsoDatetimeSchema,
  }).strict(),
  z.object({
    type: z.literal("CLAIM_RESOLVED"),
    claimId: z.string(),
    itemId: z.string(),
    status: ClaimStatusSchema,
    timestamp: IsoDatetimeSchema,
  }).strict(),
  z.object({
    type: z.literal("REMOVAL_REQUESTED"),
    removalId: z.string(),
    itemId: z.string(),
    timestamp: IsoDatetimeSchema,
  }).strict(),
  z.object({
    type: z.literal("REMOVAL_EFFECTIVE"),
    removalId: z.string(),
    itemId: z.string(),
    timestamp: IsoDatetimeSchema,
  }).strict(),
  z.object({
    type: z.literal("CONSENT_REVOKED"),
    itemId: z.string(),
    timestamp: IsoDatetimeSchema,
  }).strict(),
  z.object({
    type: z.literal("PATTERN_INVALIDATED"),
    signalId: z.string(),
    timestamp: IsoDatetimeSchema,
  }).strict(),
  z.object({
    type: z.literal("REBUILD_SUCCESS"),
    signalId: z.string(),
    timestamp: IsoDatetimeSchema,
  }).strict(),
  z.object({
    type: z.literal("REBUILD_FAILED"),
    signalId: z.string(),
    timestamp: IsoDatetimeSchema,
  }).strict(),
  z.object({
    type: z.literal("REBUILD_BELOW_FLOOR"),
    signalId: z.string(),
    itemCount: z.number().int().min(0),
    creatorCount: z.number().int().min(0),
    timestamp: IsoDatetimeSchema,
  }).strict(),
]);
export type ProvenanceTelemetryEvent = z.infer<typeof ProvenanceTelemetryEventSchema>;

export const SupersedingAssertionSchema = z
  .object({
    id: z.string(),
    targetItemId: z.string(),
    replacesAssertionId: z.string(),
    correctedCreatorId: z.string().nullable(),
    correctedLicenseType: LicenceIdSchema.nullable(),
    rationale: z.string().min(1).max(2000),
    recordedBy: z.string().min(1).max(200),
    recordedAt: IsoDatetimeSchema,
  })
  .strict();

export const SupersedeAttributionInputSchema = z
  .object({
    targetItemId: z.string(),
    replacesAssertionId: z.string(),
    correctedCreatorId: z.string().nullable().optional(),
    correctedLicenseType: LicenceIdSchema.nullable().optional(),
    rationale: z.string().min(1).max(2000),
    recordedBy: z.string().min(1).max(200),
  })
  .strict()
  .refine(
    (input) =>
      input.correctedCreatorId !== undefined ||
      input.correctedLicenseType !== undefined,
    "a superseding assertion must correct at least one attribution field",
  );

export const ConsentRevocationInputSchema = z
  .object({
    itemId: z.string(),
    revokedBy: z.string().min(1).max(200),
  })
  .strict();

// ── Permission derivation (policy §5.2, ADR-0003 D3) ─────────────────────
// Effective permission = licence ∩ consent tier ∩ policy, computed at read
// time. Never stored as a mutable field.

export function derivePermissionResult(
  licence: LicenceId,
  consentTier: "DISPLAY" | "PATTERN_DERIVE" | "FULL",
): PermissionResult {
  // Policy constraint outranks both: ND licences are display-only even with
  // PATTERN_DERIVE or FULL consent.
  if (NoDerivativesLicences.has(licence)) {
    return "DISPLAY_ONLY";
  }
  // NC licences are display-only until the commercial-use posture is decided.
  if (NonCommercialLicences.has(licence)) {
    return "DISPLAY_ONLY";
  }
  // Consent tier gates derivation for permissive licences.
  if (consentTier === "DISPLAY") {
    return "DISPLAY_ONLY";
  }
  return consentTier === "PATTERN_DERIVE" ? "PATTERN_DERIVE" : "FULL";
}

export const PermissionDecisionInputSchema = z
  .object({
    licence: LicenceIdSchema,
    consentTier: z.enum(["DISPLAY", "PATTERN_DERIVE", "FULL"]),
  })
  .strict();
