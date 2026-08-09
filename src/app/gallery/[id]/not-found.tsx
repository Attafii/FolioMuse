import { Button } from "@/components/ui/button";

/**
 * Segment not-found boundary for /gallery/[id] (plan T9).
 * Rendered when notFound() is called for unknown/hidden records; Next sets
 * HTTP 404 + robots noindex. No stack traces or private data.
 */

export default function PortfolioDetailNotFound() {
  return (
    <div
      data-testid="portfolio-detail-not-found"
      className="mx-auto flex w-full max-w-6xl flex-col items-start gap-4 px-4 pb-24 pt-12 sm:px-6 lg:px-8"
    >
      <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
        404
      </p>
      <h1 className="font-display text-3xl font-semibold tracking-tight text-card-foreground">
        Portfolio not found
      </h1>
      <p className="max-w-[65ch] text-base leading-relaxed text-muted-foreground">
        This reference is unavailable. It may have been removed, is no longer
        publicly listed, or never existed.
      </p>
      <Button type="button" variant="outline" render={<a href="/browse" />}>
        Back to gallery
      </Button>
    </div>
  );
}
