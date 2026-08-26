"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { CardPreview } from "@/components/card-preview";
import { CardBookmark } from "@/components/card-bookmark";
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
  L0: "L0 Â· Unusable",
  L1: "L1 Â· Minimal",
  L2: "L2 Â· Adequate",
  L3: "L3 Â· Strong",
  L4: "L4 Â· Exemplary",
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
    >
      {QUALITY_LEVEL_LABELS[level]}
    </Badge>
  );
}

/**
 * Media slot for the portfolio card (plan portfolio-card-system T6).
 *
 * - Fixed 16:9 aspect-ratio box => no layout shift from skeleton -> image ->
 *   fallback (the box dimension never changes).
 * - Responsive native <img> (width 100%, height 100%, object-fit cover) for
 *   arbitrary curated HTTPS hosts - we deliberately do NOT broaden
 *   next.config.ts remote patterns (ADR-0006 D4); a controlled CDN enabling
 *   Next Image srcset is a future decision.
 * - lazy + async decoding + no-referrer; onError swaps to the fallback.
 * - The whole media region links to the attributed source URL in a new tab;
 *   it is the card's primary navigation surface (R3 attribution travels).
 */
function MediaRegion({ item }: { item: GalleryItemSummary }) {
  const [failed, setFailed] = useState(false);
  const hasMedia = item.mediaUrl !== null && !failed;
  const label = `${item.title} by ${item.attribution.creatorName} (opens in new tab)`;

  return (
    <div className="relative block w-full overflow-hidden border-b border-border">
      <a
        href={item.attribution.sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={label}
        className="block w-full"
        style={{ aspectRatio: CARD_MEDIA_ASPECT_RATIO }}
      >
        {hasMedia ? (
          // Native responsive <img> for arbitrary curated HTTPS hosts (ADR-0006
          // D4): Next Image would require broadening remote allowlists, which is
          // intentionally avoided until a controlled CDN exists.
          // eslint-disable-next-line @next/next/no-img-element -- documented tradeoff
          <img
            data-testid={CARD_TEST_IDS.media}
            src={item.mediaUrl as string}
            alt={`${item.title} by ${item.attribution.creatorName}`}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            onError={() => setFailed(true)}
            className="h-full w-full object-cover transition-transform duration-500 ease-[var(--ease-standard)] group-hover/card:scale-[1.03]"
          />
        ) : (
          <div
            data-testid={CARD_TEST_IDS.mediaFallback}
            aria-hidden="true"
            className="flex h-full w-full items-center justify-center bg-muted/60"
          >
            <span className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
              No preview
            </span>
          </div>
        )}
      </a>
      {/* Preview trigger + overlay: sibling of the source anchor, never nested. */}
      <CardPreview item={item} />
    </div>
  );
}

/**
 * Reusable gallery card (plan portfolio-card-system T6-T8). Summaries only -
 * NEVER renders contentBlob/structureJSON (originality rules R3/R5).
 *
 * - Media-led: fixed 16:9 media region linking to attribution.sourceUrl.
 * - Metadata: title, creator, role, styleTags, stackTags (distinct treatment),
 *   freshness from reviewedAt, qualityLevel badge, editorial-sample badge.
 * - Source availability is STATIC: the attribution link is always present;
 *   no live probing of third-party pages (ADR-0006 D4).
 * - Interaction structure (Metis/T4): the source link and the bookmark/
 *   preview controls (added in T7/T8) are valid siblings - no interactive
 *   element is ever nested inside an anchor.
 */
export function GalleryCard({ item }: { item: GalleryItemSummary }) {
  const isSample = isEditorialSample(item);
  const freshness = freshnessLabel(item.reviewedAt);
  const sourceLabel = item.attribution.sourceUrl;

  return (
    <Card
      data-testid={CARD_TEST_IDS.card}
      size="default"
      variant="hover"
      className="card-glow group/card h-full bg-card/75 backdrop-blur-sm transition-all duration-300 ease-[var(--ease-standard)] hover:-translate-y-1"
      
    >
      <MediaRegion item={item} />

      <CardContent className="flex flex-1 flex-col gap-3 pt-(--card-spacing)">
        <div className="flex flex-col gap-1">
          <h3
            data-testid={CARD_TEST_IDS.title}
            className="font-display text-base font-semibold leading-snug tracking-tight text-card-foreground"
          >
            <a
              href={`/gallery/${item.id}`}
              data-testid="card-detail-link"
              className="transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
            >
              {item.title}
            </a>
          </h3>
          <p data-testid={CARD_TEST_IDS.creator} className="text-sm text-muted-foreground">
            {item.attribution.creatorName}
          </p>
          <span
            data-testid={CARD_TEST_IDS.role}
            className="inline-flex w-fit items-center rounded-full px-2 py-0.5 font-mono text-[11px] font-medium"
            style={roleChipStyle(item.creatorRole)}
          >
            {item.creatorRole}
          </span>
        </div>

        {item.stackTags.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {item.stackTags.slice(0, 10).map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                data-testid={CARD_TEST_IDS.stack}
                className="font-mono text-xs"
              >
                {tag}
              </Badge>
            ))}
          </div>
        ) : null}

        {item.styleTags.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {item.styleTags.slice(0, 5).map((tag) => (
              <Badge
                key={tag}
                variant="outline"
                data-testid={CARD_TEST_IDS.style}
                className="font-mono text-xs text-muted-foreground"
              >
                {tag}
              </Badge>
            ))}
          </div>
        ) : null}

        {freshness ? (
          <p
            data-testid={CARD_TEST_IDS.freshness}
            className="font-mono text-xs text-muted-foreground"
          >
            {freshness}
          </p>
        ) : null}
      </CardContent>

      <CardFooter className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <QualityBadge level={item.qualityLevel} />
          <span className="truncate font-mono text-[11px] text-muted-foreground">
            {new URL(item.attribution.sourceUrl).hostname.replace(/^www\./, "")}
          </span>
          {isSample ? (
            <Badge
              variant="outline"
              data-testid={CARD_TEST_IDS.sample}
              className="font-mono text-xs"
            >
              Editorial sample
            </Badge>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <CardBookmark itemId={item.id} />
          {item.githubUrl ? (
            <a
              href={item.githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="card-github"
              aria-label={`Open-source repository for ${item.title} (opens in new tab)`}
              className="inline-flex items-center rounded-md px-2 py-1 font-mono text-xs text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
            >
              GitHub
            </a>
          ) : null}
          <a
            href={sourceLabel}
            target="_blank"
            rel="noopener noreferrer"
            data-testid={CARD_TEST_IDS.source}
            className="inline-flex items-center rounded-md px-2 py-1 font-mono text-xs text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
          >
            {CARD_COPY.sourceLabel}
          </a>
        </div>
      </CardFooter>
    </Card>
  );
}
