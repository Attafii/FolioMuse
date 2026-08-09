"use client";

import { Button } from "@/components/ui/button";

/**
 * Segment error boundary for /gallery/[id] (plan T9).
 * Keyboard-accessible retry; never renders stack traces or private data.
 */

export default function PortfolioDetailError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { reset } = props;
  // error is intentionally not surfaced to users (no stack traces/private data).
  return (
    <div
      data-testid="portfolio-detail-error"
      role="alert"
      className="mx-auto flex w-full max-w-6xl flex-col items-start gap-4 px-4 pb-24 pt-12 sm:px-6 lg:px-8"
    >
      <p className="font-display text-lg font-medium text-card-foreground">
        This reference could not be loaded.
      </p>
      <p className="max-w-[65ch] text-sm text-muted-foreground">
        The record may have changed. Try again, or return to the gallery.
      </p>
      <div className="flex gap-3">
        <Button type="button" variant="outline" onClick={reset}>
          Try again
        </Button>
        <Button type="button" variant="ghost" render={<a href="/browse" />}>
          Back to gallery
        </Button>
      </div>
      {/* Never surface error.message/digest content to users. */}
    </div>
  );
}
