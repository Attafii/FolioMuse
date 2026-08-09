"use client";

import { useEffect, useRef, useState } from "react";
import { Eye } from "lucide-react";

import { CARD_COPY, CARD_TEST_IDS } from "@/components/gallery-card-fixtures";
import { cn } from "@/lib/utils";
import type { GalleryItemSummary } from "@/domain/curation/types";

/**
 * Hover/focus media preview + explicit touch/keyboard control
 * (plan portfolio-card-system T7).
 *
 * - Progressive enhancement: on hover-capable devices the same curated media
 *   is revealed on hover or focus-within (CSS-only, gated by
 *   `@media (hover: hover)` so touch taps never fake-hover).
 * - Deterministic path: an explicit Preview button (overlaid on the media
 *   region, a SIBLING of the source anchor - never nested) toggles the panel;
 *   this is the touch and keyboard path.
 * - Escape closes the panel and restores focus to the trigger.
 * - No focus trap (decorative preview), no iframe, no source-page loading;
 *   overlay uses the --z-overlay token; reduced motion is enforced globally
 *   (globals.css) and the panel transition uses token durations.
 * - Cards without media render no preview affordance (nothing to preview).
 */

export function CardPreview({ item }: { item: GalleryItemSummary }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelId = `card-preview-panel-${item.id}`;

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  if (item.mediaUrl === null) return null;

  const alt = `${item.title} by ${item.attribution.creatorName}`;

  return (
    <div className="group/preview absolute inset-0">
      {/* Trigger: sibling of the source anchor (never nested inside it). */}
      <button
        ref={triggerRef}
        type="button"
        data-testid={CARD_TEST_IDS.preview}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? CARD_COPY.previewClose : CARD_COPY.previewOpen}
        onClick={() => setOpen((value) => !value)}
        className="absolute right-2 top-2 z-[var(--z-overlay)] inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-background/90 text-muted-foreground shadow-sm backdrop-blur transition-colors hover:bg-background hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Eye aria-hidden="true" className="h-4 w-4" />
      </button>

      {/* Panel: hover/focus-within reveal on hover-capable devices, explicit
          open state for touch/keyboard. aria-hidden when not explicitly open
          (hover reveal is decorative and must not spam screen readers). */}
      <div
        id={panelId}
        data-testid={CARD_TEST_IDS.previewPanel}
        aria-hidden={!open}
        className={cn(
          "pointer-events-none absolute inset-0 z-[var(--z-overlay)] overflow-hidden bg-card transition-opacity duration-[var(--duration-base)] ease-[var(--ease-standard)]",
          "opacity-0",
          "[@media(hover:hover)]:group-hover/preview:opacity-100",
          "group-focus-within/preview:opacity-100",
          open && "opacity-100",
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- documented tradeoff (ADR-0006) */}
        <img
          src={item.mediaUrl}
          alt={alt}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          className="h-full w-full object-cover"
        />
      </div>
    </div>
  );
}
