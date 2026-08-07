"use client";

import { GalleryCard } from "@/components/gallery-card";
import { Button } from "@/components/ui/button";
import type { GalleryItemSummary } from "@/domain/curation/types";

/**
 * Results grid + count + Prev/Next pagination (plan T8).
 *
 * Presentational: receives already-paginated items plus pagination metadata
 * and a single onPageChange callback. No state, no logic.
 *
 * - Count is announced via aria-live="polite" so screen readers hear filter
 *   result changes (plan T5 a11y requirement).
 * - Pagination is Prev/Next + "Page X of Y" only; hidden when totalPages <= 1.
 * - Copy register: "N portfolios", "Page X of Y" - no em-dashes.
 */

export interface ResultsGridProps {
  pageItems: GalleryItemSummary[];
  totalCount: number;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function ResultsGrid({
  pageItems,
  totalCount,
  page,
  totalPages,
  onPageChange,
}: ResultsGridProps) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-baseline justify-between gap-4">
        <p
          data-testid="browse-count"
          aria-live="polite"
          className="font-mono text-sm text-muted-foreground"
        >
          {totalCount} {totalCount === 1 ? "portfolio" : "portfolios"}
        </p>
        {totalPages > 1 ? (
          <p className="font-mono text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </p>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {pageItems.map((item) => (
          <GalleryCard key={item.id} item={item} />
        ))}
      </div>

      {totalPages > 1 ? (
        <nav
          data-testid="browse-pagination"
          aria-label="Pagination"
          className="flex items-center justify-center gap-4"
        >
          <Button
            type="button"
            variant="outline"
            size="sm"
            data-testid="browse-prev"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            Prev
          </Button>
          <span className="font-mono text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            data-testid="browse-next"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            Next
          </Button>
        </nav>
      ) : null}
    </div>
  );
}
