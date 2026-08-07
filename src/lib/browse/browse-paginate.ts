import type { GalleryItemSummary } from "@/domain/curation/types";

/** Page size: 9 cards = 3x3 grid at lg. */
export const PAGE_SIZE = 9;

export interface PaginationResult {
  pageItems: GalleryItemSummary[];
  totalPages: number;
  totalCount: number;
  page: number;
}

/**
 * Slice items for a 1-based page.
 *
 * - page < 1 clamps to 1; page beyond the last clamps to the last page.
 * - totalPages is always >= 1 (empty corpus still has page 1).
 * - Returns a new array; never mutates the input.
 */
export function paginateItems(
  items: GalleryItemSummary[],
  page: number,
): PaginationResult {
  const totalCount = items.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const clamped = Math.min(Math.max(1, page), totalPages);
  const start = (clamped - 1) * PAGE_SIZE;
  const pageItems = items.slice(start, start + PAGE_SIZE);
  return { pageItems, totalPages, totalCount, page: clamped };
}
