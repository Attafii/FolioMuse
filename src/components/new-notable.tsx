"use client";

import { useEffect, useRef } from "react";

import { GalleryCard } from "@/components/gallery-card";
import { SectionHeader } from "@/components/section-header";
import { useGalleryQuery } from "@/hooks/use-gallery-query";
import { sectionVisibilityKey, useTelemetry } from "@/hooks/use-telemetry";

/**
 * New & notable portfolios (plan T9).
 *
 * Client component — server-ranked top page via useGalleryQuery (ONE small
 * request; the era of shipping the whole gallery to the browser is over).
 * Renders up to 6 accepted items, ordered by the API (qualityLevel DESC,
 * reviewedAt DESC).
 *
 * States: loading (skeleton cards, real loading) → error (retry) → data
 * (cards or honest empty state).
 *
 * Telemetry (plan T17): section_visible → IMPRESSION per card on first
 * render with a deterministic idempotency key — exactly-once even under
 * StrictMode double-mounts. No page-view events (ADR-0004 non-metrics).
 */

const TOP_N = 6;
const TELEMETRY_SOURCE = "new_notable";

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-hidden>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-xl border border-border bg-card">
          {/* Media box reserves the stable 16:9 ratio (no layout shift). */}
          <div className="aspect-[16/9] w-full animate-pulse bg-muted/60" />
          <div className="flex flex-col gap-2 p-(--card-spacing)">
            <div className="h-4 w-3/4 animate-pulse rounded bg-muted/60" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-muted/60" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function NewNotable() {
  // Server-side top page: quality-ranked, 6 items — ~30 KB, not the corpus.
  const { items, loading, error, refetch } = useGalleryQuery({
    sort: "quality",
    pageSize: 6,
  });
  const { impression } = useTelemetry();
  const cards = items.slice(0, TOP_N);
  const reported = useRef(false);

  useEffect(() => {
    if (reported.current) return;
    if (loading || error || cards.length === 0) return;
    reported.current = true;
    for (const card of cards) {
      impression(
        card.id,
        { source: TELEMETRY_SOURCE },
        sectionVisibilityKey(TELEMETRY_SOURCE, card.id),
      );
    }
  }, [cards, loading, error, impression]);

  return (
    <section
      aria-labelledby="new-notable-heading"
      data-testid="new-notable"
      className="flex flex-col gap-8"
    >
      <SectionHeader
        id="new-notable-heading"
        title="New and notable"
        description="Freshly reviewed portfolios from the curation queue."
      />

      {loading ? <SkeletonGrid /> : null}

      {!loading && error ? (
        <div className="flex flex-col items-start gap-3 rounded-lg border border-border bg-card p-8">
          <p className="font-display text-lg font-medium text-card-foreground">
            {error}
          </p>
          <button
            type="button"
            onClick={refetch}
            className="rounded-md border border-border px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-muted"
          >
            Try again
          </button>
        </div>
      ) : null}

      {!loading && !error && cards.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-10 text-center">
          <p className="font-display text-lg font-medium text-card-foreground">
                  No portfolios yet - be the first to submit.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            The gallery fills after the first curation review.
          </p>
        </div>
      ) : null}

      {!loading && !error && cards.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((item) => (
            <GalleryCard key={item.id} item={item} />
          ))}
        </div>
      ) : null}
    </section>
  );
}
