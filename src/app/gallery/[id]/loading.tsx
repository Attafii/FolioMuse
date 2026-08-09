// Segment loading boundary for /gallery/[id] (plan T9).
// Mirrors the detail layout shape (media-led) so there is no layout shift
// from skeleton to loaded page.

export default function PortfolioDetailLoading() {
  return (
    <div
      data-testid="portfolio-detail-loading"
      aria-busy="true"
      className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 pb-24 pt-12 sm:px-6 lg:px-8"
    >
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <div className="aspect-[16/9] w-full animate-pulse rounded-xl border border-border bg-muted/60" />
        </div>
        <div className="flex flex-col gap-3 lg:col-span-4">
          <div className="h-6 w-2/3 animate-pulse rounded bg-muted/60" />
          <div className="h-4 w-1/2 animate-pulse rounded bg-muted/60" />
          <div className="h-4 w-3/4 animate-pulse rounded bg-muted/60" />
        </div>
      </div>
    </div>
  );
}
