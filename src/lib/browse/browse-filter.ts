import type { GalleryItemSummary } from "@/domain/curation/types";
import type { BrowseState } from "@/lib/browse/browse-types";

/**
 * Case-insensitive substring match mirroring search-hero.tsx:matchesQuery.
 */
function matchesQuery(item: GalleryItemSummary, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  if (item.title.toLowerCase().includes(q)) return true;
  if (item.creatorRole.toLowerCase().includes(q)) return true;
  return item.styleTags.some((tag) => tag.toLowerCase().includes(q));
}

function matchesAny(
  haystack: string[],
  needles: string[],
): boolean {
  if (needles.length === 0) return true;
  const lowered = haystack.map((h) => h.toLowerCase());
  return needles.some((needle) => lowered.includes(needle.toLowerCase()));
}

/**
 * Apply the browse filter pipeline to a list of summaries.
 *
 * - Search: case-insensitive substring over title / creatorRole / styleTags.
 * - Each facet is OR within the facet (any selected value matches),
 *   AND across facets (every active facet must match).
 * - Empty facet arrays impose no constraint.
 * - Returns a NEW array; never mutates the input.
 */
export function filterItems(
  items: GalleryItemSummary[],
  state: BrowseState,
): GalleryItemSummary[] {
  return items.filter((item) => {
    if (!matchesQuery(item, state.q)) return false;
    if (!matchesAny([item.creatorRole], state.roles)) return false;
    if (!matchesAny(item.styleTags, state.styles)) return false;
    if (state.quality.length > 0 && !state.quality.includes(item.qualityLevel)) {
      return false;
    }
    if (state.consent.length > 0 && !state.consent.includes(item.consentTier)) {
      return false;
    }
    return true;
  });
}
