// /sections loading boundary (plan T8). Mirrors the card grid shape.

export default function SectionsLoading() {
  return (
    <div
      data-testid="sections-loading"
      aria-busy="true"
      className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 pb-24 pt-12 sm:px-6 lg:px-8"
    >
      <div className="h-8 w-1/3 animate-pulse rounded bg-muted/60" />
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-8 w-24 animate-pulse rounded-full bg-muted/60" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="aspect-[16/9] w-full animate-pulse bg-muted/60" />
            <div className="flex flex-col gap-2 p-(--card-spacing)">
              <div className="h-4 w-2/3 animate-pulse rounded bg-muted/60" />
              <div className="h-3 w-1/2 animate-pulse rounded bg-muted/60" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
