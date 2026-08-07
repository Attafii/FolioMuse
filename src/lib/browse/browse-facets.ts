import type { GalleryItemSummary } from "@/domain/curation/types";

/** A single facet option with its derived count. */
export interface Facet {
  value: string;
  count: number;
}

/** All facet groups derived from the unfiltered corpus. */
export interface BrowseFacets {
  roles: Facet[];
  styles: Facet[];
  qualities: Facet[];
  consents: Facet[];
}

/**
 * Derive facet options with real counts from the (unfiltered) corpus.
 *
 * - Counts are exact: each item contributes once per distinct value.
 * - Values are deduped case-insensitively; original casing is kept as label.
 * - Each facet group is sorted by count DESC then label ASC.
 * - Styles: an item contributes EACH of its styleTags.
 */
export function deriveFacets(items: GalleryItemSummary[]): BrowseFacets {
  const count = (values: string[]): Facet[] => {
    const map = new Map<string, { label: string; count: number }>();
    for (const value of values) {
      const trimmed = value.trim();
      if (!trimmed) continue;
      const key = trimmed.toLowerCase();
      const existing = map.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        map.set(key, { label: trimmed, count: 1 });
      }
    }
    return [...map.values()]
      .map(({ label, count: c }) => ({ value: label, count: c }))
      .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
  };

  const roles: string[] = [];
  const styles: string[] = [];
  const qualities: string[] = [];
  const consents: string[] = [];

  for (const item of items) {
    roles.push(item.creatorRole);
    styles.push(...item.styleTags);
    qualities.push(item.qualityLevel);
    consents.push(item.consentTier);
  }

  return {
    roles: count(roles),
    styles: count(styles),
    qualities: count(qualities),
    consents: count(consents),
  };
}
