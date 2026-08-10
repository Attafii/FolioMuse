// Section library domain service (plan section-library-detail T5/T6, ADR-0008).
//
// Pure service over a row provider: builds strict-safe SectionCard /
// SectionDetail projections and enforces eligible-only guards (parent item
// ACCEPTED, non-FLAG, consent not revoked). No Prisma/Next imports.
// Similar sections and aggregation-floor handling are deterministic and
// bounded (ADR-0008 D5/D8).

import {
  SectionLessonSchema,
  SectionTypeSchema,
  type SectionCard,
  type SectionDetail,
  type SectionRecordRow,
} from "@/domain/curation/section-schemas";

export interface SectionRowProvider {
  listRows: () => Promise<SectionRecordRow[]>;
  findRowById: (id: string) => Promise<SectionRecordRow | null>;
}

export interface SectionListFilter {
  sectionType?: import("@/domain/curation/section-schemas").SectionType;
}

function isEligible(row: SectionRecordRow): boolean {
  return (
    row.status === "ACCEPTED" &&
    row.complianceStatus !== "FLAG" &&
    row.consentRevokedAt === null
  );
}

function toCard(row: SectionRecordRow): SectionCard {
  return {
    id: row.id,
    sectionType: SectionTypeSchema.parse(row.sectionType),
    title: row.title,
    creatorName: row.creatorName,
    creatorRole: row.creatorRole,
    desktopCropUrl: row.desktopCropUrl,
    mobileCropUrl: row.mobileCropUrl,
    itemId: row.itemId,
  };
}

export async function listSectionCards(
  provider: SectionRowProvider,
  filter: SectionListFilter = {},
): Promise<SectionCard[]> {
  const rows = await provider.listRows();
  const eligible = rows.filter(isEligible);
  const filtered =
    filter.sectionType === undefined
      ? eligible
      : eligible.filter((r) => r.sectionType === filter.sectionType);
  // Deterministic sort: most recently added first, then id.
  return filtered
    .sort((a, b) => (a.id < b.id ? 1 : a.id > b.id ? -1 : 0))
    .map(toCard);
}

export async function getSectionDetail(
  provider: SectionRowProvider,
  id: string,
): Promise<SectionDetail | null> {
  const row = await provider.findRowById(id);
  if (!row || !isEligible(row)) return null;

  // Curated lessons (validated) - invalid stored data degrades to empty.
  const lessons = Array.isArray(row.lessons)
    ? row.lessons.filter((l) => SectionLessonSchema.safeParse(l).success)
    : [];
  const doNotCopyNote = row.doNotCopyNote ?? "";

  return {
    id: row.id,
    sectionType: SectionTypeSchema.parse(row.sectionType),
    title: row.title,
    creatorName: row.creatorName,
    creatorRole: row.creatorRole,
    desktopCropUrl: row.desktopCropUrl,
    mobileCropUrl: row.mobileCropUrl,
    itemId: row.itemId,
    styleTags: row.styleTags,
    stackTags: row.stackTags,
    lessons: lessons.slice(0, 12),
    // Aggregate-shaped lessons require the R2 floor; we have no aggregate
    // input in this milestone, so floor is not met unless a caller supplies it.
    aggregateLessons: [],
    aggregateFloorMet: false,
    doNotCopyNote,
    attribution: {
      creatorName: row.creatorName,
      sourceUrl: row.sourceUrl,
      licenseType: row.licenseType as SectionDetail["attribution"]["licenseType"],
      consentDate: row.consentDate,
    },
    similarSections: [],
  };
}

// ── Similar sections (ADR-0008 D8): deterministic sectionType + tag overlap ──

function normalizeTags(tags: string[]): Set<string> {
  const set = new Set<string>();
  for (const tag of tags) {
    const normalized = tag.trim().toLowerCase();
    if (normalized) set.add(normalized);
  }
  return set;
}

function overlapCount(a: Set<string>, b: Set<string>): number {
  let count = 0;
  for (const tag of a) {
    if (b.has(tag)) count += 1;
  }
  return count;
}

export async function selectSimilarSections(
  provider: SectionRowProvider,
  sourceId: string,
  options: { max?: number } = {},
): Promise<SectionCard[]> {
  const max = options.max ?? 4;
  const rows = await provider.listRows();
  const source = rows.find((r) => r.id === sourceId);
  if (!source || !isEligible(source)) return [];

  const sourceTags = normalizeTags([...source.styleTags, ...source.stackTags]);
  const scored: { row: SectionRecordRow; score: number }[] = [];

  for (const candidate of rows) {
    if (candidate.id === sourceId || !isEligible(candidate)) continue;
    // Same sectionType is the strongest signal; tag overlap adds to it.
    let score = candidate.sectionType === source.sectionType ? 2 : 0;
    score += overlapCount(sourceTags, normalizeTags([...candidate.styleTags, ...candidate.stackTags]));
    if (score === 0) continue;
    scored.push({ row: candidate, score });
  }

  scored.sort((a, b) => b.score - a.score || (a.row.id < b.row.id ? -1 : 1));
  return scored.slice(0, max).map((entry) => toCard(entry.row));
}
