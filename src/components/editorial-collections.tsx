"use client";

import { useMemo } from "react";

import { GalleryCard } from "@/components/gallery-card";
import { SectionHeader } from "@/components/section-header";
import { useGallerySummaries } from "@/hooks/use-gallery-summaries";
import { EDITORIAL_COLLECTIONS } from "@/lib/editorial-collections";

/**
 * Editorial collections (plan T12).
 *
 * Renders hand-written collections (src/lib/editorial-collections.ts) that
 * reference REAL seeded items by sourceUrl. Items are resolved against the
 * shared fetched summaries — references missing from the gallery are dropped
 * gracefully (no broken cards). Attribution stays on every card (R3); cards
 * link to the item's external sourceUrl in a new tab.
 *
 * ONE fetch source: reuses the shared useGallerySummaries cache.
 */

function CollectionSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-hidden>
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="h-40 animate-pulse rounded-xl border border-border bg-muted/60"
        />
      ))}
    </div>
  );
}

export function EditorialCollections() {
  const { items, loading, error, refetch } = useGallerySummaries();

  const bySourceUrl = useMemo(() => {
    const map = new Map<string, (typeof items)[number]>();
    for (const item of items) map.set(item.attribution.sourceUrl, item);
    return map;
  }, [items]);

  // Resolve + drop missing refs gracefully (acceptance criterion: no broken card).
  const collections = useMemo(() => {
    if (loading || error) return [];
    return EDITORIAL_COLLECTIONS.map((collection) => ({
      ...collection,
      items: collection.itemSourceUrls
        .map((url) => bySourceUrl.get(url))
        .filter((item): item is NonNullable<typeof item> => item !== undefined),
    })).filter((collection) => collection.items.length > 0);
  }, [loading, error, bySourceUrl]);

  return (
    <section
      aria-labelledby="editorial-collections-heading"
      data-testid="editorial-collections"
      className="flex flex-col gap-10"
    >
      <SectionHeader
        id="editorial-collections-heading"
        eyebrow="Curated"
        title="Editorial collections"
        description="Hand-picked portfolios worth studying, with a point of view."
      />

      {loading ? <CollectionSkeleton /> : null}

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
            Collections will appear once portfolios are accepted.
          </p>
        </div>
      ) : null}

      {!loading && !error && items.length > 0 ? (
        <div className="flex flex-col gap-10">
          {collections.map((collection) => (
            <article key={collection.id} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <h3 className="font-display text-xl font-semibold tracking-tight text-card-foreground">
                  {collection.title}
                </h3>
                <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">
                  {collection.intro}
                </p>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {collection.items.map((item) => (
                  <GalleryCard key={item.id} item={item} />
                ))}
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
