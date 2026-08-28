"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Star, Sparkles, ArrowRight } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { CardBookmark } from "@/components/card-bookmark";
import { useGalleryQuery } from "@/hooks/use-gallery-query";
import { roleChipStyle } from "@/lib/design/roles";
import type { GalleryItemSummary, QualityLevel } from "@/domain/curation/types";

/** Ahmed Attafi's portfolio ID — always featured as Portfolio of the Day. */
const AHMED_ATTAFI_ID = "cmt8us4xv00dgigktqsz3viqh";

const QUALITY_LEVEL_LABELS: Record<QualityLevel, string> = {
  L0: "L0 · Unusable",
  L1: "L1 · Minimal",
  L2: "L2 · Adequate",
  L3: "L3 · Strong",
  L4: "L4 · Exemplary",
};

function qualityToStars(level: QualityLevel): number {
  const map: Record<QualityLevel, number> = { L0: 0, L1: 1, L2: 2, L3: 4, L4: 5 };
  return map[level];
}

function QualityStars({ level }: { level: QualityLevel }) {
  const stars = qualityToStars(level);
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          aria-hidden="true"
          className={`size-4 ${
            i < stars ? "fill-amber-400 text-amber-400" : "fill-transparent text-white/30"
          }`}
        />
      ))}
      <span className="ml-2 font-mono text-sm font-medium text-white/80">
        {QUALITY_LEVEL_LABELS[level]}
      </span>
    </div>
  );
}

export function PortfolioOfTheDay() {
  const { items, loading } = useGalleryQuery({ sort: "quality", pageSize: 20 });
  const [selected, setSelected] = useState<GalleryItemSummary | null>(null);
  const [imgFailed, setImgFailed] = useState(false);
  const [imgLoading, setImgLoading] = useState(true);

  useEffect(() => {
    if (items.length === 0) return;
    
    // Always pick Ahmed Attafi first, then random from top 20
    const ahmedCard = items.find((item) => item.id === AHMED_ATTAFI_ID);
    if (ahmedCard) {
      setSelected(ahmedCard);
    } else {
      // Random selection from top 20
      const randomIndex = Math.floor(Math.random() * items.length);
      setSelected(items[randomIndex]);
    }
  }, [items]);

  if (loading || !selected) {
    return (
      <section
        aria-labelledby="potd-heading"
        data-testid="portfolio-of-the-day"
        className="relative overflow-hidden rounded-3xl border border-border/60 bg-card shadow-2xl"
      >
        <div className="aspect-[21/9] w-full shimmer" />
      </section>
    );
  }

  const hasMedia = selected.mediaUrl !== null && !imgFailed;

  return (
    <section
      aria-labelledby="potd-heading"
      data-testid="portfolio-of-the-day"
      className="relative overflow-hidden rounded-3xl border border-border/60 bg-card shadow-2xl transition-shadow duration-500 hover:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)]"
    >
      {/* Decorative elements */}
      <div className="absolute -right-20 -top-20 z-10 h-40 w-40 rounded-full bg-gradient-to-br from-amber-500/20 to-transparent blur-2xl" />
      <div className="absolute -left-20 -bottom-20 z-10 h-40 w-40 rounded-full bg-gradient-to-tr from-primary/20 to-transparent blur-2xl" />

      {/* Background image with overlay */}
      <div className="relative aspect-[21/9] w-full overflow-hidden">
        {hasMedia ? (
          <>
            {imgLoading && <div className="absolute inset-0 shimmer" />}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={selected.mediaUrl as string}
              alt={`${selected.title} — portfolio by ${selected.attribution.creatorName}`}
              width={1200}
              height={514}
              loading="eager"
              decoding="async"
              referrerPolicy="no-referrer"
              onLoad={() => setImgLoading(false)}
              onError={() => { setImgFailed(true); setImgLoading(false); }}
              className={`h-full w-full object-cover transition-all duration-700 ${
                imgLoading ? "opacity-0 scale-105" : "opacity-100 scale-100"
              }`}
            />
          </>
        ) : (
          <div
            className="relative flex h-full w-full items-center justify-center overflow-hidden bg-gradient-to-br from-muted/50 to-muted"
            style={roleChipStyle(selected.creatorRole)}
          >
            <div className="flex flex-col items-center gap-3">
              <span className="font-display text-8xl font-bold tracking-tighter opacity-30">
                {selected.attribution.creatorName.charAt(0).toUpperCase()}
              </span>
              <span className="font-mono text-sm uppercase tracking-[0.18em] opacity-60">
                {selected.creatorRole}
              </span>
            </div>
          </div>
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />

        {/* Content overlay */}
        <div className="absolute inset-0 flex flex-col justify-end p-8 sm:p-10">
          {/* Badge */}
          <div className="mb-4 flex items-center gap-2">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/20 px-3 py-1 backdrop-blur-sm">
              <Sparkles className="size-3.5 text-amber-400" />
              <span className="font-mono text-xs font-semibold tracking-wide text-amber-300">
                Portfolio of the Day
              </span>
            </div>
          </div>

          {/* Title and creator */}
          <h2
            id="potd-heading"
            className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl"
          >
            {selected.title}
          </h2>
          <p className="mt-2 font-display text-lg font-medium text-white/80 sm:text-xl">
            by {selected.attribution.creatorName}
          </p>

          {/* Rating */}
          <div className="mt-4">
            <QualityStars level={selected.qualityLevel} />
          </div>

          {/* Tags */}
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="inline-flex items-center rounded-full bg-white/15 px-3 py-1 font-mono text-xs font-medium tracking-wide text-white backdrop-blur-sm">
              {selected.creatorRole}
            </span>
            {selected.stackTags.slice(0, 4).map((tag) => (
              <Badge
                key={tag}
                className="rounded-full border-white/20 bg-white/10 px-2.5 py-0.5 font-mono text-xs font-medium text-white backdrop-blur-sm"
              >
                {tag}
              </Badge>
            ))}
          </div>

          {/* Actions */}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link
              href={`/gallery/${selected.id}`}
              className="inline-flex h-12 items-center gap-2.5 rounded-full bg-white px-6 font-mono text-sm font-semibold tracking-wide text-black transition-all hover:bg-white/90 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black/50"
            >
              <ExternalLink className="size-4" />
              View Full Portfolio
            </Link>
            <a
              href={selected.attribution.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Open live portfolio for ${selected.title} (opens in new tab)`}
              className="inline-flex h-12 items-center gap-2.5 rounded-full border border-white/30 bg-white/10 px-6 font-mono text-sm font-medium tracking-wide text-white backdrop-blur-sm transition-all hover:bg-white/20 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              Visit Live Site
              <ArrowRight className="size-4" />
            </a>
            <CardBookmark itemId={selected.id} />
          </div>
        </div>
      </div>
    </section>
  );
}
