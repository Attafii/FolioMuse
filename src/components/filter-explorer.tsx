"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { GalleryCard } from "@/components/gallery-card";
import { SectionHeader } from "@/components/section-header";
import { useGallerySummaries } from "@/hooks/use-gallery-summaries";
import { sectionVisibilityKey, useTelemetry } from "@/hooks/use-telemetry";
import type { GalleryItemSummary } from "@/domain/curation/types";

/**
 * Shared chip-filter section (plan T10/T11).
 *
 * Derives distinct facet values (creatorRole for the role explorer, styleTags
 * for the section explorer) from the fetched summaries — NEVER a hardcoded
 * taxonomy. Chips show the value + a REAL count derived from data. Clicking a
 * chip filters the displayed GalleryCards to items matching that value
 * (client state only, no routing). Selecting the active chip again clears the
 * filter.
 *
 * One fetch source: reuses the shared useGallerySummaries cache — this
 * section never triggers its own fetch.
 *
 * Telemetry (plan T17): section_visible → IMPRESSION per visible item on
 * first render with a deterministic idempotency key (exactly-once even under
 * StrictMode). Callers pass a telemetrySource (role_explorer /
 * section_explorer) so each section is attributed separately.
 */

export interface FilterExplorerProps {
  id: string;
  testid: string;
  eyebrow?: string;
  title: string;
  description: string;
  /** Extract facet values from an item (single value, e.g. creatorRole). */
  getValues: (item: GalleryItemSummary) => string[];
  chipTestId: string;
  countTestId: string;
  /** Telemetry attribution source for section_visible events (plan T17). */
  telemetrySource: string;
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-hidden>
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="h-44 animate-pulse rounded-xl border border-border bg-muted/60"
        />
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
  getValues,
  chipTestId,
  countTestId,
  telemetrySource,
}: FilterExplorerProps) {
  const { items, loading, error, refetch } = useGallerySummaries();
  const { impression } = useTelemetry();
  const [active, setActive] = useState<string | null>(null);
  const reported = useRef(false);

  // section_visible → IMPRESSION per item on first render (fire-and-forget,
  // deterministic idempotency key so StrictMode never double-records).
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

  const facets = useMemo(() => {
    const counts = new Map<string, { label: string; count: number }>();
    for (const item of items) {
      for (const value of getValues(item)) {
        const key = value.trim().toLowerCase();
        if (!key) continue;
        const existing = counts.get(key);
        if (existing) {
          existing.count += 1;
        } else {
          counts.set(key, { label: value.trim(), count: 1 });
        }
      }
    }
    return [...counts.values()].sort(
      (a, b) => b.count - a.count || a.label.localeCompare(b.label),
    );
  }, [items, getValues]);

  const visible = useMemo(() => {
    if (!active) return items;
    return items.filter((item) =>
      getValues(item).some((v) => v.trim().toLowerCase() === active),
    );
  }, [items, active, getValues]);

  return (
    <section
      aria-labelledby={id}
      data-testid={testid}
      className="flex flex-col gap-8"
    >
      <SectionHeader id={id} eyebrow={eyebrow} title={title} description={description} />

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

      {!loading && !error && items.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-10 text-center">
          <p className="font-display text-lg font-medium text-card-foreground">
            Nothing to explore yet.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Facets appear once portfolios are accepted.
          </p>
        </div>
      ) : null}

      {!loading && !error && items.length > 0 ? (
        <>
          <div
            role="group"
            aria-label={`Filter by ${title.toLowerCase()}`}
            className="flex flex-wrap gap-2"
          >
            {facets.map((facet) => {
              const isActive = active === facet.label.toLowerCase();
              return (
                <button
                  key={facet.label}
                  type="button"
                  data-testid={chipTestId}
                  aria-pressed={isActive}
                  onClick={() =>
                    setActive(isActive ? null : facet.label.toLowerCase())
                  }
                  className={`inline-flex h-8 items-center gap-1.5 rounded-4xl border px-3 text-xs font-medium transition-colors ${
                    isActive
                      ? "border-ring bg-primary text-primary-foreground"
                      : "border-border bg-card text-foreground hover:border-ring/60 hover:bg-muted"
                  }`}
                >
                  {facet.label}
                  <span
                    data-testid={countTestId}
                    className={`font-mono ${isActive ? "text-primary-foreground/80" : "text-muted-foreground"}`}
                  >
                    {facet.count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((item) => (
              <GalleryCard key={item.id} item={item} />
            ))}
          </div>

          {visible.length === 0 ? (
            <div className="rounded-lg border border-border bg-card p-10 text-center">
              <p className="font-display text-lg font-medium text-card-foreground">
                No portfolios match this filter.
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Try another role or tag.
              </p>
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
