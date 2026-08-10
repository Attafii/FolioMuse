import Link from "next/link";

import { Button } from "@/components/ui/button";

/**
 * /sections/[id] not-found boundary (plan T8). Rendered when notFound() is
 * called for hidden/ineligible section parents; Next sets noindex.
 */

export default function SectionDetailNotFound() {
  return (
    <div
      data-testid="section-detail-not-found"
      className="mx-auto flex w-full max-w-6xl flex-col items-start gap-4 px-4 pb-24 pt-12 sm:px-6 lg:px-8"
    >
      <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
        404
      </p>
      <h1 className="font-display text-3xl font-semibold tracking-tight text-card-foreground">
        Section not found
      </h1>
      <p className="max-w-[65ch] text-base leading-relaxed text-muted-foreground">
        This section reference is unavailable. It may belong to a portfolio that
        is no longer publicly listed.
      </p>
      <Button type="button" variant="outline" render={<Link href="/sections" />}>
        Back to sections
      </Button>
    </div>
  );
}
