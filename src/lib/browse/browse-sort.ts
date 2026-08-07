import type { GalleryItemSummary, QualityLevel } from "@/domain/curation/types";
import type { BrowseState } from "@/lib/browse/browse-types";

/** Quality rank: higher is better. L0 unusable -> L4 best (curation-rubric §1). */
const QUALITY_RANK: Record<QualityLevel, number> = {
  L0: 0,
  L1: 1,
  L2: 2,
  L3: 3,
  L4: 4,
};

/**
 * Sort gallery summaries per the requested SortKey.
 *
 * - newest (default): reviewedAt desc, null reviewedAt last, title asc tie-break
 * - title-asc / title-desc: localeCompare on title
 * - quality: quality rank desc (L4 first), title asc tie-break
 *
 * Returns a NEW array; never mutates the input.
 */
export function sortItems(
  items: GalleryItemSummary[],
  state: BrowseState,
): GalleryItemSummary[] {
  const sorted = [...items];

  switch (state.sort) {
    case "title-asc":
      return sorted.sort((a, b) => a.title.localeCompare(b.title));
    case "title-desc":
      return sorted.sort((a, b) => b.title.localeCompare(a.title));
    case "quality":
      return sorted.sort((a, b) => {
        const rankDiff = QUALITY_RANK[b.qualityLevel] - QUALITY_RANK[a.qualityLevel];
        if (rankDiff !== 0) return rankDiff;
        return a.title.localeCompare(b.title);
      });
    case "newest":
    default:
      return sorted.sort((a, b) => {
        if (a.reviewedAt === null && b.reviewedAt === null) {
          return a.title.localeCompare(b.title);
        }
        if (a.reviewedAt === null) return 1;
        if (b.reviewedAt === null) return -1;
        const timeDiff = b.reviewedAt.localeCompare(a.reviewedAt);
        if (timeDiff !== 0) return timeDiff;
        return a.title.localeCompare(b.title);
      });
  }
}
