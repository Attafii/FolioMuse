"use client";

import { useEffect, useRef, useState } from "react";

import { GalleryCard } from "@/components/gallery-card";
import { SectionHeader } from "@/components/section-header";
import {
  useGalleryFacets,
  useGalleryQuery,
  type GalleryQueryParams,
} from "@/hooks/use-gallery-query";
import { sectionVisibilityKey, useTelemetry } from "@/hooks/use-telemetry";
import { roleChipStyle } from "@/lib/design/roles";

/**
 * Shared chip-filter section (plan T10/T11, LCP refactor).
 *
 * Chips come from SERVER-computed facet counts (/api/gallery/facets) â€” never
 * a hardcoded taxonomy, never derived from shipping the corpus to the client.
 * Clicking a chip issues a small server-filtered page of cards; clicking the
 * active chip clears back to the unfiltered first page.
 *
 * Telemetry (plan T17): section_visible â†’ IMPRESSION per visible item on
 * first render with a deterministic idempotency key (exactly-once even under
 * StrictMode). Callers pass telemetrySource so sections attribute separately.
 */

export interface FilterExplorerProps {
  id: string;
  testid: string;
  eyebrow?: string;
  title: string;
  description: string;
  /** Which server facet group powers this explorer's chips. */
  facetGroup: "roles" | "styles";
  chipTestId: string;
  countTestId: string;
  /** Telemetry attribution source for section_visible events (plan T17). */
  telemetrySource: string;
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2" aria-hidden>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="aspect-[16/10] w-full shimmer" />
          <div className="flex flex-col gap-2 p-(--card-spacing)">
            <div className="h-4 w-3/4 rounded shimmer" />
            <div className="h-3 w-1/2 rounded shimmer" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function FilterExplorer({
  id,
  testid,
  eyebrow,
  title,
  description,
  facetGroup,
  chipTestId,
  countTestId,
  telemetrySource,
}: FilterExplorerProps) {
  const { facets, loading: facetsLoading, error: facetsError, refetch: refetchFacets } =
    useGalleryFacets();
  const [active, setActive] = useState<string | null>(null);
  const { impression } = useTelemetry();
  const reported = useRef(false);

  const queryParams: GalleryQueryParams =
    active === null
      ? { pageSize: 9 }
      : facetGroup === "roles"
        ? { role: [active], pageSize: 9 }
        : { style: [active], pageSize: 9 };
  const { items, loading, error, refetch } = useGalleryQuery(queryParams);

  // Pin Ahmed Attafi's portfolio first
  const AHMED_ATTAFI_ID = "cmt8us4xv00dgigktqsz3viqh";
  const ahmedCard = items.find((item) => item.id === AHMED_ATTAFI_ID);
  const otherCards = items.filter((item) => item.id !== AHMED_ATTAFI_ID);
  const sortedItems = ahmedCard
    ? [ahmedCard, ...otherCards]
    : items;

  // section_visible â†’ IMPRESSION per item on first render (fire-and-forget).
  useEffect(() => {
    if (reported.current) return;
    if (loading || error || items.length === 0) return;
    reported.current = true;
    for (const item of items) {
      impression(
        item.id,
        { source: telemetrySource },
        sectionVisibilityKey(telemetrySource, item.id),
      );
    }
  }, [items, loading, error, impression, telemetrySource]);

  const groupFacets = facets?.[facetGroup] ?? [];
  const anyLoading = facetsLoading || loading;
  const [expanded, setExpanded] = useState(false);
  const COLLAPSED_LIMIT = 12;
  const visibleFacets = expanded ? groupFacets : groupFacets.slice(0, COLLAPSED_LIMIT);
  const hiddenCount = Math.max(0, groupFacets.length - COLLAPSED_LIMIT);

  return (
    <section aria-labelledby={id} data-testid={testid} className="flex flex-col gap-8">
      <SectionHeader id={id} eyebrow={eyebrow} title={title} description={description} />

      {anyLoading ? <SkeletonGrid /> : null}

      {!anyLoading && (facetsError || error) ? (
        <div className="flex flex-col items-start gap-3 rounded-lg border border-border bg-card p-8">
          <p className="font-display text-lg font-medium text-card-foreground">
            {facetsError ?? error}
          </p>
          <button
            type="button"
            onClick={facetsError ? refetchFacets : refetch}
            className="rounded-md border border-border px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-muted"
          >
            Try again
          </button>
        </div>
      ) : null}

      {!anyLoading && !(facetsError ?? error) && groupFacets.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-10 text-center">
          <p className="font-display text-lg font-medium text-card-foreground">
            Nothing to explore yet.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Facets appear once portfolios are accepted.
          </p>
        </div>
      ) : null}

      {!anyLoading && groupFacets.length > 0 ? (
        <>
          <div role="group" aria-label={`Filter by ${title.toLowerCase()}`} className="flex flex-wrap gap-2">
            {visibleFacets.map((facet) => {
              const isActive = active === facet.value;
              return (
                <button
                  key={facet.value}
                  type="button"
                  data-testid={chipTestId}
                  aria-pressed={isActive}
                  onClick={() => setActive(isActive ? null : facet.value)}
                  style={
                    facetGroup === "roles" && !isActive
                      ? roleChipStyle(facet.value)
                      : undefined
                  }
                  className={`inline-flex h-8 items-center gap-1.5 rounded-4xl border px-3 text-xs font-medium transition-colors ${
                    isActive
                      ? "border-ring bg-primary text-primary-foreground"
                      : "border-transparent hover:border-ring/60 hover:brightness-95 dark:hover:brightness-110"
                  }`}
                >
                  {facet.value}
                  <span
                    data-testid={countTestId}
                    className={`font-mono ${isActive ? "text-primary-foreground/80" : "text-muted-foreground"}`}
                  >
                    {facet.count}
                  </span>
                </button>
              );
            })}
            {hiddenCount > 0 ? (
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="inline-flex h-8 items-center rounded-4xl border border-dashed border-border px-3 text-xs font-medium text-muted-foreground transition-colors hover:border-ring/60 hover:text-foreground"
              >
                {expanded ? "Show less" : `+${hiddenCount} more`}
              </button>
            ) : null}
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {sortedItems.map((item) => (
              <GalleryCard key={item.id} item={item} />
            ))}
          </div>

          {sortedItems.length === 0 ? (
            <div className="rounded-lg border border-border bg-card p-10 text-center">
              <p className="font-display text-lg font-medium text-card-foreground">
                No portfolios match this filter.
              </p>
              <p className="mt-2 text-sm text-muted-foreground">Try another role or tag.</p>
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
