// Section library strict safe projections (plan section-library-detail T2,
// ADR-0008).
//
// - SECTION_TYPES is the closed taxonomy vocabulary (source of truth).
// - SectionCardSchema / SectionDetailSchema are strict (.strict()) safe
//   projections: crops + taxonomy metadata + curated/aggregated lessons +
//   do-not-copy note + attribution/provenance + similar sections. NEVER raw
//   content, structure, DOM snapshots, or claimant/private data.
// - Aggregate-shaped lessons only appear when the R2 floor is met; otherwise
//   aggregateFloorMet=false and the UI shows "insufficient data".

import { z } from "zod";

import {
  AttributionSchema,
  MediaUrlSchema,
} from "@/domain/curation/schemas";
import { StructuralLessonSchema } from "@/domain/provenance/schemas";

// ── Closed taxonomy vocabulary (ADR-0008 D1) ────────────────────────────────

export const SECTION_TYPES = [
  "hero",
  "project grid",
  "timeline",
  "contact CTA",
  "about",
  "footer",
  "stats",
  "navigation",
  "gallery",
  "testimonial",
] as const;

export const SectionTypeSchema = z.enum(SECTION_TYPES);
export type SectionType = z.infer<typeof SectionTypeSchema>;

// ── Curated lesson reason codes (ADR-0008 D5) ───────────────────────────────

export const LESSON_CODES = ["CLARITY", "HIERARCHY", "FOCUS", "MOTION", "ACCESSIBILITY"] as const;

export const LessonCodeSchema = z.enum(LESSON_CODES);
export type LessonCode = z.infer<typeof LessonCodeSchema>;

export const SectionLessonSchema = z
  .object({
    code: LessonCodeSchema,
    label: z.string().trim().min(1, "lesson label must not be empty").max(120, "lesson label is too long"),
  })
  .strict();
export type SectionLesson = z.infer<typeof SectionLessonSchema>;

// ── Section card (browse surface) ───────────────────────────────────────────

export const SectionCardSchema = z
  .object({
    id: z.string(),
    sectionType: SectionTypeSchema,
    title: z.string().trim().min(1).max(160),
    creatorName: z.string().trim().min(1).max(200),
    creatorRole: z.string().trim().min(1).max(120),
    desktopCropUrl: MediaUrlSchema,
    mobileCropUrl: MediaUrlSchema,
    itemId: z.string(),
  })
  .strict();
export type SectionCard = z.infer<typeof SectionCardSchema>;

// ── Section detail (full safe context, ADR-0008 D4/D5/D6) ───────────────────

export const SectionDetailSchema = z
  .object({
    // Card fields + richer metadata.
    id: z.string(),
    sectionType: SectionTypeSchema,
    title: z.string().trim().min(1).max(160),
    creatorName: z.string().trim().min(1).max(200),
    creatorRole: z.string().trim().min(1).max(120),
    desktopCropUrl: MediaUrlSchema,
    mobileCropUrl: MediaUrlSchema,
    itemId: z.string(),
    styleTags: z.array(z.string()),
    stackTags: z.array(z.string()),

    // Curated transferable lessons (always shown).
    lessons: z.array(SectionLessonSchema).max(12),

    // R2-aggregated lessons (StructuralLesson shape) - only when floor met.
    aggregateLessons: z.array(StructuralLessonSchema).max(4),
    aggregateFloorMet: z.boolean(),

    // Curator-authored do-not-copy note (bounded).
    doNotCopyNote: z
      .string()
      .trim()
      .min(1, "do-not-copy note must not be empty")
      .max(600, "do-not-copy note is too long"),

    // Attribution (R3).
    attribution: AttributionSchema,

    // Deterministic similar sections (capped).
    similarSections: z.array(SectionCardSchema).max(4),
  })
  .strict();
export type SectionDetail = z.infer<typeof SectionDetailSchema>;

// ── Repository read record (internal; never exposed publicly) ───────────────
// Carries the fields the service needs to build safe projections.

export interface SectionRecordRow {
  id: string;
  sectionType: string;
  title: string;
  desktopCropUrl: string | null;
  mobileCropUrl: string | null;
  lessons: unknown;
  doNotCopyNote: string | null;
  itemId: string;
  creatorName: string;
  creatorRole: string;
  styleTags: string[];
  stackTags: string[];
  sourceUrl: string;
  licenseType: string;
  consentDate: string;
  status: string;
  complianceStatus: string | null;
  consentRevokedAt: string | null;
}
