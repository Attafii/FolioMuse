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
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
    >
      {Array.from({ length: 9 }).map((_, i) => (
        <div
          key={i}
          className="h-44 animate-pulse rounded-xl border border-border bg-muted/60"
        />
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
