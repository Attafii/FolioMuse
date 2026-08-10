"use client";

import { useMemo, useState } from "react";
import { FolderPlus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { useSectionCollections } from "@/hooks/use-section-collections";
import { useTelemetry } from "@/hooks/use-telemetry";
import { cn } from "@/lib/utils";
import type { SectionCard } from "@/domain/curation/section-schemas";

/**
 * Section library view (plan section-library-detail T9, ADR-0008).
 * - Taxonomy filter chips (closed vocabulary) with counts; aria-pressed.
 * - Section card grid: crop thumbnail (fallback), sectionType label, creator,
 *   portfolio link, and local collection action (COLLECTION_ADD telemetry).
 * - Empty state when no sections match; responsive 1/2/3 columns.
 */

const COLLECTION_SOURCE = "section_library";

function SectionCardTile({ card }: { card: SectionCard }) {
  const { isCollected, toggle } = useSectionCollections();
  const { collectionAdd } = useTelemetry();
  const collected = isCollected(card.id);

  function handleCollect() {
    const next = !collected;
    toggle(card.id);
    if (next) {
      collectionAdd(card.id, { source: COLLECTION_SOURCE, context: "section" });
    }
  }

  return (
    <article
      data-testid="section-card"
      className="flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-ring/60 hover:bg-muted/40"
    >
      <a
        href={`/sections/${card.id}`}
        className="group block"
        aria-label={`${card.title} - ${card.sectionType} section`}
      >
        <div className="relative aspect-[16/9] w-full overflow-hidden bg-muted/40">
          {card.desktopCropUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- documented tradeoff (ADR-0008)
            <img
              src={card.desktopCropUrl}
              alt={`${card.title} by ${card.creatorName} - ${card.sectionType} crop`}
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
              className="h-full w-full object-cover transition-transform duration-[var(--duration-base)] group-hover:scale-[1.02]"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <span className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
                No crop
              </span>
            </div>
          )}
        </div>
      </a>
      <div className="flex flex-1 flex-col gap-2 p-(--card-spacing)">
        <div className="flex items-center justify-between gap-2">
          <Badge variant="outline" data-testid="section-type" className="font-mono text-xs">
            {card.sectionType}
          </Badge>
          <button
            type="button"
            data-testid="section-collect"
            aria-pressed={collected}
            aria-label={collected ? "Remove from collection" : "Add to collection"}
            onClick={handleCollect}
            className={cn(
              "inline-flex h-8 w-8 items-center justify-center rounded-md border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              collected
                ? "border-ring bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:border-ring/60 hover:text-foreground",
            )}
          >
            <FolderPlus aria-hidden="true" className={cn("h-4 w-4", collected && "fill-current")} />
          </button>
        </div>
        <a
          href={`/sections/${card.id}`}
          className="font-display text-base font-semibold leading-snug tracking-tight text-card-foreground hover:text-primary"
        >
          {card.title}
        </a>
        <p className="mt-auto font-mono text-xs text-muted-foreground">
          {card.creatorName} · {card.creatorRole}
        </p>
        <a
          href={`/gallery/${card.itemId}`}
          className="font-mono text-xs text-primary underline-offset-4 hover:underline"
        >
          View portfolio
        </a>
      </div>
    </article>
  );
}

export function SectionLibraryView({
  cards,
  taxonomy,
}: {
  cards: SectionCard[];
  taxonomy: string[];
}) {
  const [active, setActive] = useState<string | null>(null);

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const card of cards) {
      map.set(card.sectionType, (map.get(card.sectionType) ?? 0) + 1);
    }
    return map;
  }, [cards]);

  const visible = useMemo(
    () => (active ? cards.filter((c) => c.sectionType === active) : cards),
    [cards, active],
  );

  return (
    <main
      data-testid="section-library"
      className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 pb-24 pt-12 sm:px-6 lg:px-8"
    >
      <header className="flex flex-col gap-3">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
          Pattern library
        </p>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-card-foreground sm:text-4xl">
          Section library
        </h1>
        <p className="max-w-[65ch] text-base leading-relaxed text-muted-foreground">
          Browse heroes, project grids, timelines, contact CTAs, and other
          reusable patterns independently - with attribution preserved.
        </p>
      </header>

      {/* Taxonomy filter chips */}
      <div role="group" aria-label="Filter by section type" className="flex flex-wrap gap-2">
        <button
          type="button"
          aria-pressed={active === null}
          onClick={() => setActive(null)}
          data-testid="section-filter-all"
          className={cn(
            "inline-flex h-8 items-center gap-1.5 rounded-4xl border px-3 text-xs font-medium transition-colors",
            active === null
              ? "border-ring bg-primary text-primary-foreground"
              : "border-border bg-card text-foreground hover:border-ring/60 hover:bg-muted",
          )}
        >
          All
          <span className="font-mono text-xs text-muted-foreground">{cards.length}</span>
        </button>
        {taxonomy.map((type) => {
          const isActive = active === type;
          const count = counts.get(type) ?? 0;
          return (
            <button
              key={type}
              type="button"
              aria-pressed={isActive}
              onClick={() => setActive(isActive ? null : type)}
              data-testid="section-filter-chip"
              className={cn(
                "inline-flex h-8 items-center gap-1.5 rounded-4xl border px-3 text-xs font-medium transition-colors",
                isActive
                  ? "border-ring bg-primary text-primary-foreground"
                  : "border-border bg-card text-foreground hover:border-ring/60 hover:bg-muted",
              )}
            >
              {type}
              <span
                className={cn(
                  "font-mono text-xs",
                  isActive ? "text-primary-foreground/80" : "text-muted-foreground",
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Card grid */}
      {visible.length > 0 ? (
        <div data-testid="section-card-grid" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((card) => (
            <SectionCardTile key={card.id} card={card} />
          ))}
        </div>
      ) : (
        <div data-testid="section-library-empty" className="rounded-xl border border-border bg-card p-10 text-center">
          <p className="font-display text-lg font-medium text-card-foreground">
            No sections match this filter.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Try another section type.
          </p>
        </div>
      )}
    </main>
  );
}
