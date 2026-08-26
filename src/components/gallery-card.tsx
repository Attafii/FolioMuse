"use client";

import { useCallback, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { CardBookmark } from "@/components/card-bookmark";
import { CardPreview } from "@/components/card-preview";
import {
  CARD_COPY,
  CARD_MEDIA_ASPECT_RATIO,
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

function QualityBadge({ level }: { level: QualityLevel }) {
  const variant =
    level === "L4"
      ? ("success" as const)
      : level === "L3"
        ? ("info" as const)
        : level === "L2"
          ? ("secondary" as const)
          : ("outline" as const);
  return (
    <Badge
      variant={variant}
      data-testid={CARD_TEST_IDS.quality}
      title={QUALITY_LEVEL_LABELS[level]}
      className="rounded-full font-mono text-[11px] tracking-wide"
    >
      {QUALITY_LEVEL_LABELS[level]}
    </Badge>
  );
}

/**
 * Media slot — fixed aspect box, no layout shift skeleton→image→fallback.
 * Native <img> for arbitrary HTTPS hosts (ADR-0006 D4 — no broadening of
 * next.config remote patterns until controlled CDN).
 */
function MediaRegion({ item }: { item: GalleryItemSummary }) {
  const [failed, setFailed] = useState(false);
  const hasMedia = item.mediaUrl !== null && !failed;
  const label = `${item.title} by ${item.attribution.creatorName} (opens in new tab)`;

  return (
    <div className="relative block w-full overflow-hidden rounded-t-[inherit]">
      <a
        href={item.attribution.sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={label}
        className="block w-full"
        style={{ aspectRatio: CARD_MEDIA_ASPECT_RATIO }}
      >
        {hasMedia ? (
          // eslint-disable-next-line @next/next/no-img-element -- documented tradeoff
          <img
            data-testid={CARD_TEST_IDS.media}
            src={item.mediaUrl as string}
            alt={`${item.title} by ${item.attribution.creatorName}`}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            onError={() => setFailed(true)}
            className="h-full w-full object-cover transition-[transform,filter] duration-700 ease-[var(--ease-standard)] group-hover/card:scale-[1.06] group-hover/card:brightness-[1.02]"
          />
        ) : (
          <div
            data-testid={CARD_TEST_IDS.mediaFallback}
            aria-hidden="true"
            className="relative flex h-full w-full items-center justify-center overflow-hidden"
            style={roleChipStyle(item.creatorRole)}
          >
            <span className="font-display text-6xl font-bold tracking-tighter opacity-30">
              {item.attribution.creatorName.charAt(0).toUpperCase()}
            </span>
            <span className="absolute bottom-3 left-4 font-mono text-[10px] uppercase tracking-[0.18em] opacity-60">
              Screenshot unavailable
            </span>
          </div>
        )}
      </a>
      {/* subtle top gradient for legibility without re-drawn chrome */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/10 to-transparent opacity-0 transition-opacity duration-300 group-hover/card:opacity-100" />
      <CardPreview item={item} />
    </div>
  );
}

/**
 * Modern elegant spotlight portfolio card — 21st.dev inspired.
 *
 * Design read: portfolio gallery for hiring managers & founders scanning craft,
 * with a restrained editorial + cobalt language, leaning toward Tailwind v4 +
 * Geist + motion gated by prefers-reduced-motion.
 * Dials: 7 / 5 / 3 — premium consumer, airy, purposeful motion.
 *
 * Shape: 20px radius (consistent system), overflow-hidden, 1px border.
 * Hover: spotlight radial (600px) follows cursor via CSS vars --spotlight-x/y
 * written directly to element style (no React state, no re-render per frame),
 * translateY(-4px), accent-tinted shadow, image scale 1.06, border glow.
 * Dark mode: same tokens, slightly stronger spotlight opacity.
 * a11y: focus-within triggers spotlight, keyboard nav preserved, reduced-motion disables.
 */
/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V5 */
export function GalleryCard({ item }: { item: GalleryItemSummary }) {
  const isSample = isEditorialSample(item);
  const freshness = freshnessLabel(item.reviewedAt);
  const sourceLabel = item.attribution.sourceUrl;
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    el.style.setProperty("--spotlight-x", `${x}%`);
    el.style.setProperty("--spotlight-y", `${y}%`);
  }, []);

  return (
    <div
      ref={cardRef}
      data-testid={CARD_TEST_IDS.card}
      onMouseMove={handleMouseMove}
      className="spotlight-card group/card flex h-full flex-col"
    >
      <div className="spotlight-inner flex h-full flex-col">
        <MediaRegion item={item} />

        {/* Content */}
        <div className="flex flex-1 flex-col gap-3 px-5 pb-0 pt-4">
          <div className="flex flex-col gap-1.5">
            <h3
              data-testid={CARD_TEST_IDS.title}
              className="font-display text-[15px] font-semibold leading-snug tracking-tight text-card-foreground line-clamp-2"
            >
              <a
                href={`/gallery/${item.id}`}
                data-testid="card-detail-link"
                className="rounded-sm transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
              >
                {item.title}
              </a>
            </h3>
            <p
              data-testid={CARD_TEST_IDS.creator}
              className="text-sm font-[450] tracking-tight text-muted-foreground"
            >
              {item.attribution.creatorName}
            </p>
            <span
              data-testid={CARD_TEST_IDS.role}
              className="inline-flex w-fit items-center rounded-full px-2.5 py-0.5 font-mono text-[11px] font-medium tracking-wide"
              style={roleChipStyle(item.creatorRole)}
            >
              {item.creatorRole}
            </span>
          </div>

          {item.stackTags.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {item.stackTags.slice(0, 6).map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  data-testid={CARD_TEST_IDS.stack}
                  className="rounded-full bg-secondary/70 px-2.5 py-0 font-mono text-[11px] font-medium tracking-wide text-secondary-foreground backdrop-blur-sm"
                >
                  {tag}
                </Badge>
              ))}
            </div>
          ) : null}

          {item.styleTags.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {item.styleTags.slice(0, 4).map((tag) => (
                <Badge
                  key={tag}
                  variant="outline"
                  data-testid={CARD_TEST_IDS.style}
                  className="rounded-full border-border/60 bg-background/40 px-2.5 py-0 font-mono text-[11px] font-medium tracking-wide text-muted-foreground backdrop-blur-sm"
                >
                  {tag}
                </Badge>
              ))}
            </div>
          ) : null}

          {freshness ? (
            <p
              data-testid={CARD_TEST_IDS.freshness}
              className="font-mono text-xs tracking-wide text-muted-foreground/80"
            >
              {freshness}
            </p>
          ) : null}
        </div>

        {/* Footer — elegant, airy */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border/50 bg-muted/20 px-5 py-3 backdrop-blur-sm">
          <div className="flex min-w-0 items-center gap-2">
            <QualityBadge level={item.qualityLevel} />
            <span className="hidden truncate font-mono text-[11px] tracking-wide text-muted-foreground sm:inline">
              {new URL(item.attribution.sourceUrl).hostname.replace(/^www\./, "")}
            </span>
            {isSample ? (
              <Badge
                variant="outline"
                data-testid={CARD_TEST_IDS.sample}
                className="rounded-full border-dashed font-mono text-[11px]"
              >
                Editorial sample
              </Badge>
            ) : null}
          </div>
          <div className="flex items-center gap-1">
            <CardBookmark itemId={item.id} />
            {item.githubUrl ? (
              <a
                href={item.githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                data-testid="card-github"
                aria-label={`Open-source repository for ${item.title} (opens in new tab)`}
                className="inline-flex h-7 items-center rounded-full bg-background px-2.5 font-mono text-xs font-medium tracking-wide text-muted-foreground ring-1 ring-border/60 transition-all hover:bg-foreground hover:text-background hover:ring-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                GitHub
              </a>
            ) : null}
            <a
              href={sourceLabel}
              target="_blank"
              rel="noopener noreferrer"
              data-testid={CARD_TEST_IDS.source}
              className="inline-flex h-7 items-center rounded-full bg-foreground px-3 font-mono text-xs font-medium tracking-wide text-background transition-all hover:bg-foreground/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {CARD_COPY.sourceLabel}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
