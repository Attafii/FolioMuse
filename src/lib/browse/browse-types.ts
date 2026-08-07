import type { ConsentTier, QualityLevel } from "@/domain/curation/types";

/**
 * Sort options for the browse experience.
 * "newest" is the default (reviewedAt desc, nulls last).
 */
export type SortKey = "newest" | "title-asc" | "title-desc" | "quality";

/**
 * The full URL-backed browse state. This is the single source of truth for
 * the /browse experience; it round-trips through searchParams via
 * parseBrowseParams / serializeBrowseState.
 *
 * - roles/styles are multi-select (OR within a facet)
 * - quality/consent are multi-select enums
 * - page is 1-based, clamped to >= 1
 */
export interface BrowseState {
  q: string;
  roles: string[];
  styles: string[];
  quality: QualityLevel[];
  consent: ConsentTier[];
  sort: SortKey;
  page: number;
}

/** Empty/default state: everything unfiltered, newest first, page 1. */
export const DEFAULT_BROWSE_STATE: BrowseState = {
  q: "",
  roles: [],
  styles: [],
  quality: [],
  consent: [],
  sort: "newest",
  page: 1,
};
