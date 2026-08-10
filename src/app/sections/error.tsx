"use client";

import { Button } from "@/components/ui/button";

/**
 * /sections error boundary (plan T8). Never surfaces stack traces/private data.
 */

export default function SectionsError({ reset }: { reset: () => void }) {
  return (
    <div
      data-testid="sections-error"
      role="alert"
      className="mx-auto flex w-full max-w-6xl flex-col items-start gap-4 px-4 pb-24 pt-12 sm:px-6 lg:px-8"
    >
      <p className="font-display text-lg font-medium text-card-foreground">
        The section library could not be loaded.
      </p>
      <p className="max-w-[65ch] text-sm text-muted-foreground">
        Try again, or return to the gallery.
      </p>
      <Button type="button" variant="outline" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
