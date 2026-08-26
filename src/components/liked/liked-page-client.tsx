"use client";

import { Heart } from "lucide-react";

import { GalleryCard } from "@/components/gallery-card";
import { useGalleryQuery } from "@/hooks/use-gallery-query";
import { useLocalBookmarkIds } from "@/hooks/use-local-bookmarks";

/**
 * Client island for /liked: stored ids -> exact-id server lookup -> cards.
 * Empty states distinguish "nothing liked yet" from "liked items since
 * unlisted" (creators can remove references at any time).
 */
export function LikedPageClient() {
  const ids = useLocalBookmarkIds();

  const { items, total, loading, error, refetch } = useGalleryQuery({
    ids: ids.length ? ids : undefined,
    pageSize: 60,
  });

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 pb-32 pt-16 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-3">
        <p className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
          <Heart aria-hidden className="h-3.5 w-3.5" />
          Your library
        </p>
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          Liked portfolios
        </h1>
        <p className="max-w-[65ch] text-base leading-relaxed text-muted-foreground">
          Everything you have liked, saved on this device. Tap the heart on any
          card or portfolio page to grow your shortlist.
        </p>
      </header>

      {loading && ids.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-hidden>
          {Array.from({ length: Math.min(ids.length, 6) }).map((_, i) => (
            <div key={i} className="overflow-hidden rounded-xl border border-border bg-card">
              <div className="aspect-[16/10] w-full shimmer" />
              <div className="flex flex-col gap-2 p-(--card-spacing)">
                <div className="h-4 w-3/4 rounded shimmer" />
                <div className="h-3 w-1/2 rounded shimmer" />
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {!loading && error ? (
        <div className="flex flex-col items-start gap-3 rounded-lg border border-border bg-card p-8">
          <p className="font-display text-lg font-medium text-card-foreground">{error}</p>
          <button
            type="button"
            onClick={refetch}
            className="rounded-md border border-border px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-muted"
          >
            Try again
          </button>
        </div>
      ) : null}

      {!loading && !error && ids.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-12 text-center">
          <Heart aria-hidden className="mx-auto h-10 w-10 text-muted-foreground/40" />
          <p className="mt-4 font-display text-lg font-medium text-card-foreground">
            No liked portfolios yet.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Tap the heart on any card or portfolio page and it will wait for you here.
          </p>
        </div>
      ) : null}

      {!loading && !error && ids.length > 0 && items.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          Your liked items are no longer in the public gallery. They may have
          been unlisted at the creator&apos;s request.
        </div>
      ) : null}

      {!loading && !error && items.length > 0 ? (
        <>
          <p
            data-testid="liked-count"
            aria-live="polite"
            className="font-mono text-sm text-muted-foreground"
          >
            {total} {total === 1 ? "portfolio" : "portfolios"} liked
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <GalleryCard key={item.id} item={item} />
            ))}
          </div>
        </>
      ) : null}
    </main>
  );
}
