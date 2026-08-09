// Attribution-safe portfolio detail view (plan portfolio-detail-page T10).
//
// Server component rendering the strict PortfolioDetail DTO only - never raw
// content, structure, captures, or private provenance. Design: media-led
// asymmetric 12-column layout (single column at 390px), Geist hierarchy, mono
// evidence labels, existing semantic tokens. No downloads, no carousel, no
// source-page iframe, no live probing (ADR-0007 D1).

import type { PortfolioDetail } from "@/domain/curation/detail-schemas";
import { Badge } from "@/components/ui/badge";
import { ClaimRemovalControls } from "@/components/portfolio-detail/claim-removal-controls";
import { DetailOpenTelemetry } from "@/components/portfolio-detail/detail-open-telemetry";

const QUALITY_LABELS: Record<string, string> = {
  L0: "L0 · Unusable",
  L1: "L1 · Minimal",
  L2: "L2 · Adequate",
  L3: "L3 · Strong",
  L4: "L4 · Exemplary",
};

function Capture({
  label,
  url,
  title,
  creator,
}: {
  label: string;
  url: string | null;
  title: string;
  creator: string;
}) {
  return (
    <figure>
      <div
        data-testid={label === "Desktop" ? "desktop-capture" : "mobile-capture"}
        className="relative w-full overflow-hidden rounded-xl border border-border bg-muted/40"
        style={{ aspectRatio: "16 / 9" }}
      >
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element -- documented tradeoff (ADR-0006/0007)
          <img
            src={url}
            alt={`${title} by ${creator} - ${label.toLowerCase()} capture`}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <span className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
              No {label.toLowerCase()} capture
            </span>
          </div>
        )}
      </div>
      <figcaption className="mt-2 font-mono text-xs text-muted-foreground">
        {label} capture
      </figcaption>
    </figure>
  );
}

export function PortfolioDetailView({ detail }: { detail: PortfolioDetail }) {
  const provenance = detail.provenance;
  const source = provenance?.source ?? null;
  const licence = provenance?.licence ?? null;
  const creator = provenance?.creator ?? null;

  return (
    <main
      data-testid="portfolio-detail"
      className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 pb-24 pt-12 sm:px-6 lg:px-8"
    >
      {/* Fire-and-forget OPEN telemetry (renders nothing). */}
      <DetailOpenTelemetry itemId={detail.id} />

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <header className="flex flex-col gap-3">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
          Portfolio reference
        </p>
        <h1
          data-testid="detail-title"
          className="max-w-[24ch] font-display text-3xl font-semibold tracking-tight text-card-foreground sm:text-4xl"
        >
          {detail.title}
        </h1>
        <p data-testid="detail-creator" className="text-base text-muted-foreground">
          {detail.attribution.creatorName}
          <span className="mx-2 text-border">|</span>
          <span data-testid="detail-role">{detail.creatorRole}</span>
        </p>
      </header>

      {/* ── Captures (media-led) ─────────────────────────────────────────── */}
      <section aria-labelledby="captures-heading" className="flex flex-col gap-6">
        <h2 id="captures-heading" className="font-display text-xl font-semibold tracking-tight">
          Captures
        </h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Capture
            label="Desktop"
            url={detail.desktopMediaUrl ?? detail.mediaUrl}
            title={detail.title}
            creator={detail.attribution.creatorName}
          />
          <Capture
            label="Mobile"
            url={detail.mobileMediaUrl}
            title={detail.title}
            creator={detail.attribution.creatorName}
          />
        </div>
        {detail.captureFreshness.label ? (
          <p
            data-testid="capture-freshness"
            className="font-mono text-xs text-muted-foreground"
          >
            {detail.captureFreshness.label}
          </p>
        ) : null}
      </section>

      {/* ── Metadata rail ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
        <section
          aria-labelledby="metadata-heading"
          className="flex flex-col gap-6 lg:col-span-8"
        >
          <h2 id="metadata-heading" className="font-display text-xl font-semibold tracking-tight">
            Metadata
          </h2>
          <dl className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-1.5">
              <dt className="sr-only">Style tags</dt>
              {detail.styleTags.map((tag) => (
                <Badge key={tag} variant="outline" data-testid="detail-style" className="font-mono text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <dt className="sr-only">Stack tags</dt>
              {detail.stackTags.map((tag) => (
                <Badge key={tag} variant="secondary" data-testid="detail-stack" className="font-mono text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <dt className="sr-only">Quality</dt>
              <Badge variant="info" data-testid="quality-badge">
                {QUALITY_LABELS[detail.qualityLevel] ?? detail.qualityLevel}
              </Badge>
            </div>
          </dl>

          {/* Page index */}
          {detail.pageIndex.length > 0 ? (
            <div className="flex flex-col gap-3">
              <h3 className="font-display text-base font-semibold tracking-tight">Page index</h3>
              <nav
                data-testid="page-index"
                aria-label="Page index"
                className="flex flex-wrap gap-2"
              >
                {detail.pageIndex.map((label, i) => (
                  <span
                    key={`${label}-${i}`}
                    aria-current={i === 0 ? "true" : undefined}
                    className="rounded-md border border-border bg-card px-2.5 py-1 font-mono text-xs text-foreground"
                  >
                    {i + 1}. {label}
                  </span>
                ))}
              </nav>
            </div>
          ) : null}

          {/* Sections */}
          {detail.sections && detail.sections.length > 0 ? (
            <div className="flex flex-col gap-3">
              <h3 className="font-display text-base font-semibold tracking-tight">Sections</h3>
              <ul data-testid="sections-list" className="flex flex-col gap-2">
                {detail.sections.map((section) => (
                  <li key={section.key} className="flex items-center justify-between gap-3">
                    <span className="text-sm text-foreground">{section.label}</span>
                    <span className="font-mono text-xs text-muted-foreground">
                      {section.present ? "Present" : "Absent"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {/* Strengths */}
          {detail.strengths && detail.strengths.length > 0 ? (
            <div className="flex flex-col gap-3">
              <h3 className="font-display text-base font-semibold tracking-tight">Strengths</h3>
              <ul data-testid="strengths-list" className="flex flex-col gap-2">
                {detail.strengths.map((strength) => (
                  <li key={strength.code} className="flex items-center gap-2">
                    <span className="font-mono text-xs uppercase tracking-[0.18em] text-primary">
                      {strength.code}
                    </span>
                    <span className="text-sm text-foreground">{strength.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {/* Stack evidence */}
          {detail.stackEvidence && detail.stackEvidence.length > 0 ? (
            <div className="flex flex-col gap-3">
              <h3 className="font-display text-base font-semibold tracking-tight">Stack evidence</h3>
              <ul data-testid="stack-evidence" className="flex flex-col gap-2">
                {detail.stackEvidence.map((evidence) => (
                  <li key={evidence.name} className="flex items-center justify-between gap-3">
                    <span className="font-mono text-sm text-foreground">{evidence.name}</span>
                    <span className="font-mono text-xs text-muted-foreground">{evidence.evidenceType}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>

        {/* ── Attribution / provenance rail ──────────────────────────────── */}
        <section
          aria-labelledby="attribution-heading"
          data-testid="attribution-section"
          className="flex flex-col gap-4 border-t border-border pt-6 lg:col-span-4 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0"
        >
          <h2 id="attribution-heading" className="font-display text-xl font-semibold tracking-tight">
            Attribution
          </h2>
          <dl className="flex flex-col gap-3 text-sm">
            <div className="flex flex-col gap-1">
              <dt className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">Creator</dt>
              <dd data-testid="detail-attribution-creator">{detail.attribution.creatorName}</dd>
            </div>
            <div className="flex flex-col gap-1">
              <dt className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">Source</dt>
              <dd>
                <a
                  data-testid="detail-source"
                  href={detail.attribution.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-sm text-primary underline-offset-4 break-all transition-colors hover:underline"
                >
                  {detail.attribution.sourceUrl}
                </a>
              </dd>
            </div>
            <div className="flex flex-col gap-1">
              <dt className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">Licence</dt>
              <dd>{licence?.id ?? detail.attribution.licenseType}</dd>
            </div>
            <div className="flex flex-col gap-1">
              <dt className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">Permission</dt>
              <dd>{licence?.effectivePermission ?? "DISPLAY_ONLY"}</dd>
            </div>
            <div className="flex flex-col gap-1">
              <dt className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">Consent</dt>
              <dd>{detail.consentTier}</dd>
            </div>
            <div className="flex flex-col gap-1">
              <dt className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">AI disclosure</dt>
              <dd data-testid="detail-ai-disclosure">{provenance?.aiDisclosure ?? "UNKNOWN"}</dd>
            </div>
            {creator ? (
              <div className="flex flex-col gap-1">
                <dt className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">Creator status</dt>
                <dd>{creator.verificationStatus}</dd>
              </div>
            ) : null}
            {source ? (
              <div className="flex flex-col gap-1">
                <dt className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">Captured at</dt>
                <dd className="font-mono text-xs">{source.capturedAt}</dd>
              </div>
            ) : null}
          </dl>
        </section>
      </div>

      {/* ── Similar examples ─────────────────────────────────────────────── */}
      {detail.similarExamples.length > 0 ? (
        <section aria-labelledby="similar-heading" className="flex flex-col gap-4">
          <h2 id="similar-heading" className="font-display text-xl font-semibold tracking-tight">
            Similar examples
          </h2>
          <div data-testid="similar-examples" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {detail.similarExamples.map((example) => (
              <a
                key={example.id}
                href={`/gallery/${example.id}`}
                className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4 transition-colors hover:border-ring/60 hover:bg-muted/40"
              >
                <span className="font-display text-sm font-medium text-card-foreground">
                  {example.title}
                </span>
                <span className="font-mono text-xs text-muted-foreground">
                  {example.creatorRole}
                </span>
                <span className="font-mono text-xs text-muted-foreground">
                  {example.attribution.creatorName}
                </span>
              </a>
            ))}
          </div>
        </section>
      ) : null}

      {/* ── Owner claim + removal controls ───────────────────────────────── */}
      <ClaimRemovalControls itemId={detail.id} />
    </main>
  );
}
