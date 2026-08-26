"use client";

import { Heart } from "lucide-react";

import { CARD_COPY, CARD_TEST_IDS } from "@/components/gallery-card-fixtures";
import { useLocalBookmarks } from "@/hooks/use-local-bookmarks";
import { useTelemetry } from "@/hooks/use-telemetry";
import { cn } from "@/lib/utils";

/**
 * Local bookmark control for the portfolio card (plan portfolio-card-system
 * T8).
 *
 * - Persists locally via the SSR-safe bookmark store (T3) - no backend, no
 *   auth, no sync (ADR-0006 D4).
 * - `aria-pressed` reflects state; the accessible label switches between
 *   add/remove copy (CARD_COPY).
 * - Telemetry (ADR-0004): fires the existing SAVE event ONLY when a bookmark
 *   is ADDED (SAVE = 3, a strong action signal). Removal and preview toggles
 *   stay local UI state - the closed flywheel vocabulary has no UNSAVE event.
 *   Payload carries only a source label (flat primitive), never the media
 *   URL, source URL, creator PII, or bookmark contents.
 * - Telemetry is fire-and-forget: a failed emit never breaks bookmarking.
 */

const BOOKMARK_TELEMETRY_SOURCE = "gallery_card";

export function CardBookmark({ itemId }: { itemId: string }) {
  const { isBookmarked, toggle } = useLocalBookmarks();
  const { save } = useTelemetry();
  const bookmarked = isBookmarked(itemId);

  function handleToggle() {
    const next = !bookmarked;
    toggle(itemId);
    if (next) {
      // SAVE fires only on add; removal is local state (no UNSAVE vocabulary).
      save(itemId, { source: BOOKMARK_TELEMETRY_SOURCE });
    }
  }

  return (
    <button
      type="button"
      data-testid={CARD_TEST_IDS.bookmark}
      aria-pressed={bookmarked}
      aria-label={bookmarked ? CARD_COPY.bookmarkRemove : CARD_COPY.bookmarkAdd}
      onClick={handleToggle}
      className={cn(
        "inline-flex h-9 items-center justify-center gap-1.5 rounded-md border px-2.5 font-mono text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        bookmarked
          ? "border-[var(--like-border)] bg-[var(--like-bg)] text-[var(--like-fg)]"
          : "border-border bg-card text-muted-foreground hover:border-ring/60 hover:text-foreground",
      )}
    >
      <Heart
        aria-hidden="true"
        className={cn("h-3.5 w-3.5", bookmarked && "fill-current")}
      />
      <span>{bookmarked ? "Liked" : "Like"}</span>
    </button>
  );
}
