/**
 * Presentational state views for the /browse experience (plan T8).
 *
 * Four states, zero logic inside: they receive data or callbacks via props.
 * Copy register mirrors the signed-off homepage (search-hero / filter-explorer):
 * short, functional, NO em-dashes, NO pure black/white, tokens only.
 */

export function BrowseSkeleton() {
  return (
    <div
      data-testid="browse-skeleton"
      aria-hidden
      className="grid grid-cols-1 gap-8 lg:grid-cols-2"
    >
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="overflow-hidden rounded-3xl border border-border bg-card shadow-lg"
        >
          {/* Media box reserves the stable 16:10 ratio (no layout shift). */}
          <div className="aspect-[16/10] w-full animate-pulse bg-muted/60" />
          <div className="flex flex-col gap-2 p-5">
            <div className="h-5 w-3/4 animate-pulse rounded bg-muted/60" />
            <div className="h-4 w-1/2 animate-pulse rounded bg-muted/60" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function BrowseError({
  error,
  onRetry,
}: {
  error: string;
  onRetry: () => void;
}) {
  return (
    <div
      data-testid="browse-error"
      className="flex flex-col items-start gap-3 rounded-lg border border-border bg-card p-8"
    >
      <p className="font-display text-lg font-medium text-card-foreground">
        {error}
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="rounded-md border border-border px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-muted"
      >
        Try again
      </button>
    </div>
  );
}

export function BrowseEmpty() {
  return (
    <div
      data-testid="browse-empty"
      className="rounded-lg border border-border bg-card p-10 text-center"
    >
      <p className="font-display text-lg font-medium text-card-foreground">
        No accepted portfolios yet.
      </p>
      <p className="mt-2 text-sm text-muted-foreground">
        Be the first. The gallery fills after the first curation review.
      </p>
    </div>
  );
}

export function BrowseNoResults({
  onClearAll,
}: {
  onClearAll: () => void;
}) {
  return (
    <div
      data-testid="browse-no-results"
      className="rounded-lg border border-border bg-card p-10 text-center"
    >
      <p className="font-display text-lg font-medium text-card-foreground">
        No portfolios match these filters.
      </p>
      <p className="mt-2 text-sm text-muted-foreground">
        Try different filters or clear them to see everything.
      </p>
      <button
        type="button"
        onClick={onClearAll}
        data-testid="browse-clear-filters"
        className="mt-4 rounded-md border border-border px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-muted"
      >
        Clear filters
      </button>
    </div>
  );
}
