"use client";

import { useCallback, useRef, useState } from "react";
import { ExternalLink, Heart, Star } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { CardBookmark } from "@/components/card-bookmark";
import {
  CARD_COPY,
  CARD_TEST_IDS,
} from "@/components/gallery-card-fixtures";
import { freshnessLabel } from "@/lib/freshness";
import { roleChipStyle } from "@/lib/design/roles";
import type { GalleryItemSummary, QualityLevel } from "@/domain/curation/types";

/**
 * Shared editorial sample labeling (plan T9 homepage). All seeded items are
 * labeled editorial samples; kept as a title-prefix matcher so no fake/sample
 * data ever masquerades as a real, verified portfolio.
 */
export const EDITORIAL_SAMPLE_PREFIX = "Editorial Sample";

export function isEditorialSample(item: GalleryItemSummary): boolean {
  return item.title.startsWith(EDITORIAL_SAMPLE_PREFIX);
}

const QUALITY_LEVEL_LABELS: Record<QualityLevel, string> = {
  L0: "L0 \u00B7 Unusable",
  L1: "L1 \u00B7 Minimal",
  L2: "L2 \u00B7 Adequate",
  L3: "L3 \u00B7 Strong",
  L4: "L4 \u00B7 Exemplary",
};

/** Map quality level to a 0-5 star rating for display. */
function qualityToStars(level: QualityLevel): number {
  const map: Record<QualityLevel, number> = {
    L0: 0,
    L1: 1,
    L2: 2,
    L3: 4,
    L4: 5,
  };
  return map[level];
}

function QualityStars({ level }: { level: QualityLevel }) {
  const stars = qualityToStars(level);
  return (
    <div className="flex items-center gap-0.5" data-testid={CARD_TEST_IDS.quality}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          aria-hidden="true"
          className={`size-3.5 ${
            i < stars
              ? "fill-amber-400 text-amber-400"
              : "fill-transparent text-white/30"
          }`}
        />
      ))}
      <span className="ml-1.5 font-mono text-[11px] font-medium text-white/70">
        {QUALITY_LEVEL_LABELS[level]}
      </span>
    </div>
  );
}

/**
 * Modern portfolio card with hover-reveal overlay.
 *
 * Design: Full-bleed preview image by default. On hover (desktop), the image
 * blurs and a dark overlay slides up with portfolio details, actions, and
 * AI rating. Touch devices show a subtle hint at the bottom.
 *
 * Shape: 16px radius, overflow-hidden, 1px border.
 * Hover: backdrop-blur-md on image, overlay with staggered fade-in.
 * a11y: focus-within triggers overlay, keyboard nav preserved.
 */
export function GalleryCard({ item }: { item: GalleryItemSummary }) {
  const isSample = isEditorialSample(item);
  const freshness = freshnessLabel(item.reviewedAt);
  const cardRef = useRef<HTMLDivElement>(null);
  const [imgFailed, setImgFailed] = useState(false);
  const [imgLoading, setImgLoading] = useState(true);
  const hasMedia = item.mediaUrl !== null && !imgFailed;

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    el.style.setProperty("--spotlight-x", `${x}%`);
    el.style.setProperty("--spotlight-y", `${y}%`);
  }, []);

  const handleImageLoad = useCallback(() => {
    setImgLoading(false);
  }, []);

  const handleImageError = useCallback(() => {
    setImgFailed(true);
    setImgLoading(false);
  }, []);

  return (
    <div
      ref={cardRef}
      data-testid={CARD_TEST_IDS.card}
      onMouseMove={handleMouseMove}
      className="spotlight-card group/card relative flex h-full flex-col overflow-hidden rounded-2xl border border-border/60 bg-card"
    >
      {/* Full-bleed media region */}
      <div className="relative aspect-[16/9] w-full overflow-hidden">
        {hasMedia ? (
          <>
            {/* Loading skeleton */}
            {imgLoading && (
              <div className="absolute inset-0 shimmer" />
            )}
            {/* eslint-disable-next-line @next/next/no-img-element -- documented tradeoff */}
            <img
              data-testid={CARD_TEST_IDS.media}
              src={item.mediaUrl as string}
              alt={`${item.title} — portfolio by ${item.attribution.creatorName}`}
              width={640}
              height={400}
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
              onLoad={handleImageLoad}
              onError={handleImageError}
              className={`h-full w-full object-cover transition-[transform,filter] duration-500 ease-[var(--ease-standard)] group-hover/card:scale-105 group-hover/card:blur-md ${
                imgLoading ? "opacity-0" : "opacity-100"
              }`}
            />
          </>
        ) : (
          <div
            data-testid={CARD_TEST_IDS.mediaFallback}
            aria-hidden="true"
            className="relative flex h-full w-full items-center justify-center overflow-hidden bg-gradient-to-br from-muted/50 to-muted"
            style={roleChipStyle(item.creatorRole)}
          >
            <div className="flex flex-col items-center gap-2">
              <span className="font-display text-6xl font-bold tracking-tighter opacity-30">
                {item.attribution.creatorName.charAt(0).toUpperCase()}
              </span>
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] opacity-60">
                {item.creatorRole}
              </span>
            </div>
          </div>
        )}

        {/* Quality badge - always visible top-left */}
        <div className="absolute left-3 top-3 z-10">
          <QualityStars level={item.qualityLevel} />
        </div>

        {/* Hover overlay - slides up on hover */}
        <div className="absolute inset-0 z-20 flex flex-col justify-end bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 transition-opacity duration-300 ease-[var(--ease-standard)] group-hover/card:opacity-100 [@media(hover:hover)]:group-hover/card:opacity-100">
          <div className="flex flex-col gap-3 p-5">
            {/* Portfolio info */}
            <div className="flex flex-col gap-1">
              <h3
                data-testid={CARD_TEST_IDS.title}
                className="font-display text-lg font-semibold leading-tight tracking-tight text-white"
              >
                {item.title}
              </h3>
              <p
                data-testid={CARD_TEST_IDS.creator}
                className="text-sm font-medium text-white/80"
              >
                {item.attribution.creatorName}
              </p>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-1.5">
              <span
                data-testid={CARD_TEST_IDS.role}
                className="inline-flex items-center rounded-full bg-white/15 px-2.5 py-0.5 font-mono text-[11px] font-medium tracking-wide text-white backdrop-blur-sm"
              >
                {item.creatorRole}
              </span>
              {item.stackTags.slice(0, 3).map((tag) => (
                <Badge
                  key={tag}
                  data-testid={CARD_TEST_IDS.stack}
                  className="rounded-full border-white/20 bg-white/10 px-2 py-0 font-mono text-[10px] font-medium text-white backdrop-blur-sm"
                >
                  {tag}
                </Badge>
              ))}
            </div>

            {/* Actions row */}
            <div className="flex items-center gap-2">
              <a
                href={`/gallery/${item.id}`}
                data-testid="card-detail-link"
                className="inline-flex h-9 items-center gap-2 rounded-full bg-white px-4 font-mono text-xs font-semibold tracking-wide text-black transition-all hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black/50"
              >
                <ExternalLink className="size-3.5" />
                Click for more details
              </a>
              <a
                href={item.attribution.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                data-testid={CARD_TEST_IDS.source}
                aria-label={`Open live portfolio for ${item.title} (opens in new tab)`}
                className="inline-flex h-9 items-center gap-2 rounded-full border border-white/30 bg-white/10 px-4 font-mono text-xs font-medium tracking-wide text-white backdrop-blur-sm transition-all hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                Live Portfolio
              </a>
              <CardBookmark itemId={item.id} />
            </div>
          </div>
        </div>

        {/* Touch hint - visible on touch devices when not hovered */}
        <div className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/60 to-transparent p-4 transition-opacity duration-300 group-hover/card:opacity-0 [@media(hover:hover)]:hidden">
          <p className="font-mono text-[11px] font-medium tracking-wide text-white/80">
            {item.title}
          </p>
          <p className="font-mono text-[10px] text-white/60">
            {item.attribution.creatorName}
          </p>
        </div>
      </div>

      {/* Bottom info bar - always visible */}
      <div className="flex items-center justify-between gap-2 border-t border-border/40 bg-card/95 px-4 py-2.5 backdrop-blur-sm">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className="truncate font-display text-sm font-semibold tracking-tight text-card-foreground">
            {item.title}
          </span>
          <span className="hidden truncate font-mono text-[11px] text-muted-foreground sm:inline">
            by {item.attribution.creatorName}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {isSample ? (
            <Badge
              variant="outline"
              data-testid={CARD_TEST_IDS.sample}
              className="rounded-full border-dashed font-mono text-[10px]"
            >
              Sample
            </Badge>
          ) : null}
          {freshness ? (
            <span
              data-testid={CARD_TEST_IDS.freshness}
              className="hidden font-mono text-[10px] text-muted-foreground/70 sm:inline"
            >
              {freshness}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
