"use client";

import Link from "next/link";

import { GalleryCard } from "@/components/gallery-card";
import type { GalleryItemSummary } from "@/domain/curation/types";
import type { BrowseState } from "@/lib/browse/browse-types";
import { serializeBrowseState } from "@/lib/browse/browse-params";

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
 * - Modern elegant pagination: pill buttons, accent hover, disabled opacity,
 *   keyboard accessible, respects prefers-reduced-motion.
 */

export interface ResultsGridProps {
  pageItems: GalleryItemSummary[];
  totalCount: number;
  page: number;
  totalPages: number;
  /** Current browse state + pathname to build real hrefs for progressive enhancement */
  browseState: BrowseState;
  pathname: string;
  onPageChange: (page: number) => void;
}

function buildPageHref(
  state: BrowseState,
  pathname: string,
  targetPage: number,
): string {
  const next: BrowseState = { ...state, page: targetPage };
  const params = serializeBrowseState(next);
  const qs = params.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

export function ResultsGrid({
  pageItems,
  totalCount,
  page,
  totalPages,
  browseState,
  pathname,
  onPageChange,
}: ResultsGridProps) {
  const prevHref = buildPageHref(browseState, pathname, page - 1);
  const nextHref = buildPageHref(browseState, pathname, page + 1);
  const isPrevDisabled = page <= 1;
  const isNextDisabled = page >= totalPages;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-baseline justify-between gap-4">
        <p
          data-testid="browse-count"
          aria-live="polite"
          className="font-mono text-sm tracking-wide text-muted-foreground"
        >
          {totalCount} {totalCount === 1 ? "portfolio" : "portfolios"}
        </p>
        {totalPages > 1 ? (
          <p className="font-mono text-sm tracking-wide text-muted-foreground">
            Page {page} of {totalPages}
          </p>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {pageItems.map((item) => (
          <GalleryCard key={item.id} item={item} />
        ))}
      </div>

      {totalPages > 1 ? (
        <nav
          data-testid="browse-pagination"
          aria-label="Pagination"
          className="relative z-10 flex items-center justify-center gap-3 pt-2"
        >
          {/* Prev: real link — href guarantees clickability even if JS fails; onClick adds SPA smoothness */}
          {isPrevDisabled ? (
            <span
              data-testid="browse-prev"
              aria-disabled="true"
              className="inline-flex h-7 cursor-not-allowed items-center justify-center rounded-full border border-border bg-muted px-5 font-mono text-xs tracking-wide text-muted-foreground opacity-40"
            >
              <span aria-hidden="true" className="mr-1">
                ←
              </span>{" "}
              Prev
            </span>
          ) : (
            <Link
              href={prevHref}
              prefetch={false}
              scroll={false}
              data-testid="browse-prev"
              onClick={() => onPageChange(page - 1)}
              className="inline-flex h-7 cursor-pointer items-center justify-center rounded-full border border-border bg-background px-5 font-mono text-xs tracking-wide text-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <span aria-hidden="true" className="mr-1">
                ←
              </span>{" "}
              Prev
            </Link>
          )}

          <span className="inline-flex items-center rounded-full border border-border/60 bg-card px-4 py-1.5 font-mono text-xs tracking-wide text-muted-foreground shadow-sm">
            Page {page} of {totalPages}
          </span>

          {isNextDisabled ? (
            <span
              data-testid="browse-next"
              aria-disabled="true"
              className="inline-flex h-7 cursor-not-allowed items-center justify-center rounded-full border border-transparent bg-muted px-5 font-mono text-xs tracking-wide text-muted-foreground opacity-40"
            >
              Next <span aria-hidden="true" className="ml-1">
                →
              </span>
            </span>
          ) : (
            <Link
              href={nextHref}
              prefetch={false}
              scroll={false}
              data-testid="browse-next"
              onClick={() => onPageChange(page + 1)}
              className="inline-flex h-7 cursor-pointer items-center justify-center rounded-full bg-foreground px-5 font-mono text-xs tracking-wide text-background transition-colors hover:bg-foreground/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              Next <span aria-hidden="true" className="ml-1">
                →
              </span>
            </Link>
          )}
        </nav>
      ) : null}
    </div>
  );
}
