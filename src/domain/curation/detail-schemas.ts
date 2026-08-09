// Strict PortfolioDetail safe projection (plan portfolio-detail-page T2).
//
// Attribution-safe detail DTO for /gallery/[id] (ADR-0007). Composes the
// safe gallery summary fields with an enriched ProvenanceSummary and bounded
// curated detail metadata. EVERY field is strict and bounded; prohibited
// fields (contentBlob, structureJSON, raw captures, fingerprints, prompts,
// hashes, claimant evidence, reviewer data, unknown keys) are rejected by
// .strict() - see __tests__/detail-schemas.test.ts.
//
// Capture/strength/stack evidence are curated METADATA only (no copied prose,
// no raw source expressions) per ADR-0007 D3. Similar examples are
// deterministic accepted/non-FLAG style/stack overlap (ADR-0007 D4).

import { z } from "zod";

import {
  AttributionSchema,
  MediaUrlSchema,
  ProvenanceSummarySchema,
  QualityLevelSchema,
  ComplianceStatusSchema,
  ItemStatusSchema,
  ConsentTierSchema,
} from "@/domain/curation/schemas";

// ── Bounded curated descriptors ──────────────────────────────────────────────

/** Finite curated strength reason codes (ADR-0007 D3) - never AI prose. */
export const StrengthCodeSchema = z.enum([
  "QUALITY",
  "STRUCTURE",
  "CLARITY",
  "COMPLETENESS",
  "CRAFT",
]);
export type StrengthCode = z.infer<typeof StrengthCodeSchema>;

export const StrengthDescriptorSchema = z
  .object({
    code: StrengthCodeSchema,
    label: z.string().trim().min(1, "strength label must not be empty").max(80, "strength label is too long"),
  })
  .strict();
export type StrengthDescriptor = z.infer<typeof StrengthDescriptorSchema>;

/** Section presence descriptor - presence only, never copied section prose. */
export const SectionDescriptorSchema = z
  .object({
    key: z.string().trim().min(1).max(40),
    label: z.string().trim().min(1, "section label must not be empty").max(60),
    present: z.boolean(),
  })
  .strict();
export type SectionDescriptor = z.infer<typeof SectionDescriptorSchema>;

/** Stack evidence metadata - name + evidence type only, no raw captures. */
export const StackEvidenceTypeSchema = z.enum(["metadata", "capture"]);
export type StackEvidenceType = z.infer<typeof StackEvidenceTypeSchema>;

export const StackEvidenceDescriptorSchema = z
  .object({
    name: z.string().trim().min(1).max(64),
    evidenceType: StackEvidenceTypeSchema,
  })
  .strict();
export type StackEvidenceDescriptor = z.infer<typeof StackEvidenceDescriptorSchema>;

// ── Capture freshness (derived from SourceRecord.capturedAt, ADR-0007) ──────

export const CaptureFreshnessSchema = z
  .object({
    capturedAt: z
      .string()
      .datetime({ message: "capturedAt must be an ISO 8601 datetime" })
      .nullable(),
    label: z.string().nullable(),
  })
  .strict();
export type CaptureFreshness = z.infer<typeof CaptureFreshnessSchema>;

// ── Similar example (deterministic overlap subset of a safe summary) ─────────

export const SimilarExampleSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    creatorRole: z.string(),
    styleTags: z.array(z.string()),
    stackTags: z.array(z.string()),
    qualityLevel: QualityLevelSchema,
    reviewedAt: z
      .string()
      .datetime({ message: "reviewedAt must be an ISO 8601 datetime" })
      .nullable(),
    mediaUrl: MediaUrlSchema,
    attribution: AttributionSchema,
  })
  .strict();
export type SimilarExample = z.infer<typeof SimilarExampleSchema>;

// ── PortfolioDetail ──────────────────────────────────────────────────────────

export const PortfolioDetailSchema = z
  .object({
    // Safe gallery summary fields (mirrors GalleryItemSummarySchema).
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
    mediaUrl: MediaUrlSchema,
    stackTags: z
      .array(z.string().trim().min(1).max(64))
      .max(10, "at most 10 stack tags are allowed"),

    // Enriched provenance (ADR-0007 D1/D2).
    provenance: ProvenanceSummarySchema.optional(),

    // Bounded curated detail metadata (ADR-0007 D3), null/empty when uncurated.
    desktopMediaUrl: MediaUrlSchema,
    mobileMediaUrl: MediaUrlSchema,
    pageIndex: z
      .array(z.string().trim().min(1).max(40))
      .max(24, "at most 24 page index labels are allowed"),
    sections: z.array(SectionDescriptorSchema).max(24).nullable(),
    strengths: z.array(StrengthDescriptorSchema).max(12).nullable(),
    stackEvidence: z.array(StackEvidenceDescriptorSchema).max(24).nullable(),
    captureFreshness: CaptureFreshnessSchema,

    // Deterministic similar examples (ADR-0007 D4), capped at 4.
    similarExamples: z.array(SimilarExampleSchema).max(4),
  })
  .strict();
export type PortfolioDetail = z.infer<typeof PortfolioDetailSchema>;
