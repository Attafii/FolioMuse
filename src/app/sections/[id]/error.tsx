"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";

/**
 * /sections/[id] error boundary (plan T8). Never surfaces stack traces/private data.
 */

export default function SectionDetailError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { reset } = props;
  return (
    <div
      data-testid="section-detail-error"
      role="alert"
      className="mx-auto flex w-full max-w-6xl flex-col items-start gap-4 px-4 pb-24 pt-12 sm:px-6 lg:px-8"
    >
      <p className="font-display text-lg font-medium text-card-foreground">
        This section reference could not be loaded.
      </p>
      <p className="max-w-[65ch] text-sm text-muted-foreground">
        Try again, or return to the section library.
      </p>
      <div className="flex gap-3">
        <Button type="button" variant="outline" onClick={reset}>
          Try again
        </Button>
        <Button type="button" variant="ghost" render={<Link href="/sections" />}>
          Back to sections
        </Button>
      </div>
    </div>
  );
}
