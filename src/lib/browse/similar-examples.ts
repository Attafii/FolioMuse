// Deterministic similar-example selection (plan portfolio-detail-page T6,
// ADR-0007 D4).
//
// Pure metadata overlap on styleTags + stackTags. NO flywheel/ranking,
// PatternSignal, StructuralLesson, behavior events, or AI similarity.
// Ordering is deterministic: overlap count DESC, reviewedAt DESC (nulls
// last), id ASC. Attribution is preserved (R3) - output is safe summaries.

import type { GalleryItemSummary } from "@/domain/curation/types";

export interface SimilarExamplesOptions {
  max?: number;
}

const DEFAULT_MAX = 4;

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

/**
 * Select similar accepted summaries by normalized style/stack tag overlap.
 * Candidates are expected to be the accepted/non-FLAG list; this function
 * still defensively skips non-ACCEPTED and FLAG candidates and the source id.
 */
export function selectSimilarExamples(
  source: Pick<GalleryItemSummary, "id" | "styleTags" | "stackTags">,
  candidates: GalleryItemSummary[],
  options: SimilarExamplesOptions = {},
): GalleryItemSummary[] {
  const max = options.max ?? DEFAULT_MAX;
  const sourceTags = normalizeTags([...source.styleTags, ...source.stackTags]);
  if (sourceTags.size === 0) return [];

  const scored: { item: GalleryItemSummary; overlap: number }[] = [];
  for (const candidate of candidates) {
    if (candidate.id === source.id) continue;
    if (candidate.status !== "ACCEPTED" || candidate.complianceStatus === "FLAG") continue;
    const candidateTags = normalizeTags([...candidate.styleTags, ...candidate.stackTags]);
    const overlap = overlapCount(sourceTags, candidateTags);
    if (overlap === 0) continue;
    scored.push({ item: candidate, overlap });
  }

  scored.sort((a, b) => {
    if (b.overlap !== a.overlap) return b.overlap - a.overlap;
    const aTime = a.item.reviewedAt ? new Date(a.item.reviewedAt).getTime() : -Infinity;
    const bTime = b.item.reviewedAt ? new Date(b.item.reviewedAt).getTime() : -Infinity;
    if (bTime !== aTime) return bTime - aTime;
    return a.item.id < b.item.id ? -1 : a.item.id > b.item.id ? 1 : 0;
  });

  return scored.slice(0, max).map((entry) => entry.item);
}
