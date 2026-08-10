/**
 * /sections/[id] loading boundary (plan T8). Mirrors the detail crop layout.
 */

export default function SectionDetailLoading() {
  return (
    <div
      data-testid="section-detail-loading"
      aria-busy="true"
      className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 pb-24 pt-12 sm:px-6 lg:px-8"
    >
      <div className="aspect-[16/9] w-full animate-pulse rounded-xl border border-border bg-muted/60" />
      <div className="flex flex-col gap-3">
        <div className="h-6 w-1/2 animate-pulse rounded bg-muted/60" />
        <div className="h-4 w-1/3 animate-pulse rounded bg-muted/60" />
      </div>
    </div>
  );
}
