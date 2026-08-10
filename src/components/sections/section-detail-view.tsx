"use client";

import { FolderPlus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { useSectionCollections } from "@/hooks/use-section-collections";
import { useTelemetry } from "@/hooks/use-telemetry";
import { cn } from "@/lib/utils";
import type { SectionDetail } from "@/domain/curation/section-schemas";

/**
 * Section detail view (plan section-library-detail T10, ADR-0008 D4-D7).
 * Full safe context: desktop/mobile crops (fallback), sectionType, portfolio
 * link, curated transferable lessons, R2-aggregate floor state, curator
 * do-not-copy note, attribution, and similar sections. Collection action is
 * local-only with COLLECTION_ADD telemetry.
 */

const COLLECTION_SOURCE = "section_library";

function Crop({ label, url, title, creator }: { label: string; url: string | null; title: string; creator: string }) {
  return (
    <figure>
      <div
        data-testid={label === "Desktop" ? "section-crop-desktop" : "section-crop-mobile"}
        className="relative w-full overflow-hidden rounded-xl border border-border bg-muted/40"
        style={{ aspectRatio: "16 / 9" }}
      >
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element -- documented tradeoff (ADR-0008)
          <img
            src={url}
            alt={`${title} by ${creator} - ${label.toLowerCase()} crop`}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <span className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
              No {label.toLowerCase()} crop
            </span>
          </div>
        )}
      </div>
      <figcaption className="mt-2 font-mono text-xs text-muted-foreground">{label} crop</figcaption>
    </figure>
  );
}

export function SectionDetailView({ detail }: { detail: SectionDetail }) {
  const { isCollected, toggle } = useSectionCollections();
  const { collectionAdd } = useTelemetry();
  const collected = isCollected(detail.id);

  function handleCollect() {
    const next = !collected;
    toggle(detail.id);
    if (next) {
      collectionAdd(detail.id, { source: COLLECTION_SOURCE, context: "section" });
    }
  }

  return (
    <main
      data-testid="section-detail"
      className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 pb-24 pt-12 sm:px-6 lg:px-8"
    >
      <header className="flex flex-col gap-3">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
          Section reference
        </p>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1
            data-testid="section-detail-title"
            className="max-w-[24ch] font-display text-3xl font-semibold tracking-tight text-card-foreground sm:text-4xl"
          >
            {detail.title}
          </h1>
          <button
            type="button"
            data-testid="section-detail-collect"
            aria-pressed={collected}
            aria-label={collected ? "Remove from collection" : "Add to collection"}
            onClick={handleCollect}
            className={cn(
              "inline-flex h-9 items-center gap-1.5 rounded-md border px-3 font-mono text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              collected
                ? "border-ring bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:border-ring/60 hover:text-foreground",
            )}
          >
            <FolderPlus aria-hidden="true" className={cn("h-4 w-4", collected && "fill-current")} />
            {collected ? "Collected" : "Collect"}
          </button>
        </div>
        <p className="text-base text-muted-foreground">
          {detail.creatorName}
          <span className="mx-2 text-border">|</span>
          <span className="font-mono text-sm">{detail.sectionType}</span>
          <span className="mx-2 text-border">|</span>
          <span>{detail.creatorRole}</span>
        </p>
      </header>

      {/* Crops */}
      <section aria-labelledby="crops-heading" className="flex flex-col gap-4">
        <h2 id="crops-heading" className="font-display text-xl font-semibold tracking-tight">
          Captures
        </h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Crop label="Desktop" url={detail.desktopCropUrl} title={detail.title} creator={detail.creatorName} />
          <Crop label="Mobile" url={detail.mobileCropUrl} title={detail.title} creator={detail.creatorName} />
        </div>
      </section>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
        {/* Lessons + notes */}
        <section aria-labelledby="lessons-heading" className="flex flex-col gap-6 lg:col-span-8">
          <h2 id="lessons-heading" className="font-display text-xl font-semibold tracking-tight">
            Transferable lessons
          </h2>
          {detail.lessons.length > 0 ? (
            <ul data-testid="section-lessons" className="flex flex-col gap-3">
              {detail.lessons.map((lesson) => (
                <li key={lesson.code} className="flex items-start gap-3">
                  <span className="mt-0.5 font-mono text-xs uppercase tracking-[0.18em] text-primary">
                    {lesson.code}
                  </span>
                  <span className="text-sm text-foreground">{lesson.label}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No curated lessons yet.</p>
          )}

          {detail.aggregateFloorMet ? (
            <div data-testid="section-aggregate" className="flex flex-col gap-2">
              <h3 className="font-display text-base font-semibold tracking-tight">Pattern summary</h3>
              {detail.aggregateLessons.map((lesson) => (
                <p key={lesson.patternType} className="text-sm text-muted-foreground">
                  {lesson.patternType}: {lesson.sourceItemCount} sources across {lesson.distinctCreatorCount} creators.
                </p>
              ))}
            </div>
          ) : (
            <p data-testid="section-floor" className="font-mono text-xs text-muted-foreground">
              Insufficient data for a pattern summary (needs at least 3 sources across 2 creators).
            </p>
          )}

          <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4">
            <h3 className="font-display text-base font-semibold tracking-tight">Do not copy</h3>
            <p data-testid="section-notes" className="text-sm text-muted-foreground">
              {detail.doNotCopyNote}
            </p>
          </div>
        </section>

        {/* Attribution rail */}
        <section
          aria-labelledby="attribution-heading"
          data-testid="section-attribution"
          className="flex flex-col gap-4 border-t border-border pt-6 lg:col-span-4 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0"
        >
          <h2 id="attribution-heading" className="font-display text-xl font-semibold tracking-tight">
            Attribution
          </h2>
          <dl className="flex flex-col gap-3 text-sm">
            <div className="flex flex-col gap-1">
              <dt className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">Creator</dt>
              <dd>{detail.attribution.creatorName}</dd>
            </div>
            <div className="flex flex-col gap-1">
              <dt className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">Licence</dt>
              <dd>{detail.attribution.licenseType}</dd>
            </div>
            <div className="flex flex-col gap-1">
              <dt className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">Source</dt>
              <dd>
                <a
                  data-testid="section-source"
                  href={detail.attribution.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-sm text-primary break-all underline-offset-4 hover:underline"
                >
                  {detail.attribution.sourceUrl}
                </a>
              </dd>
            </div>
            <div className="flex flex-col gap-1">
              <dt className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">Portfolio</dt>
              <dd>
                <a
                  data-testid="section-portfolio-link"
                  href={`/gallery/${detail.itemId}`}
                  className="font-mono text-sm text-primary underline-offset-4 hover:underline"
                >
                  View portfolio
                </a>
              </dd>
            </div>
            {detail.styleTags.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {detail.styleTags.map((tag) => (
                  <Badge key={tag} variant="outline" className="font-mono text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            ) : null}
          </dl>
        </section>
      </div>

      {/* Similar sections */}
      {detail.similarSections.length > 0 ? (
        <section aria-labelledby="similar-heading" className="flex flex-col gap-4">
          <h2 id="similar-heading" className="font-display text-xl font-semibold tracking-tight">
            Similar sections
          </h2>
          <div data-testid="section-similar" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {detail.similarSections.map((section) => (
              <a
                key={section.id}
                href={`/sections/${section.id}`}
                className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4 transition-colors hover:border-ring/60 hover:bg-muted/40"
              >
                <span className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  {section.sectionType}
                </span>
                <span className="font-display text-sm font-medium text-card-foreground">
                  {section.title}
                </span>
                <span className="font-mono text-xs text-muted-foreground">{section.creatorName}</span>
              </a>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
