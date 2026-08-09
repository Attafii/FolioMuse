# ADR-0007: Portfolio detail safe reference — attribution-only detail page with bounded curated metadata, deterministic similar examples, and protected claim/removal controls

Date: 2026
Status: Accepted

## Context

Section 02 (Experience design) requires a Portfolio Detail Page that turns a portfolio record into an informative, attributable reference: desktop/mobile captures, metadata, strengths, page index, sections, stack evidence, source links, creator attribution, capture freshness, similar examples, owner claim, and removal/report controls.

ADR-0006 (Decision 4) and decision-log D-8 explicitly excluded a detail route, full-content modal, carousel, or download flow. That exclusion was the UI-level expression of deeper, still-binding constraints: ADR-0001 (no full-content fetch / no cloning), ADR-0002 Decision 7 (no `contentBlob` + `structureJSON` public combination), ADR-0003 Decision 9 (safe projection boundary; no raw captures, fingerprints, prompts, or claimant evidence), ADR-0004 (privacy-minimized telemetry, no page-view events), and the originality rules R1-R8.

This ADR supersedes only the surface-level "no detail route" decision in ADR-0006/D-8, scoping the new page to a safe, metadata-only reference surface. It does not weaken any anti-cloning, safe-projection, attribution, consent, or privacy rule.

## Decision

### Decision 1: The detail page is an attribution-safe reference surface, not a content viewer

- `GET /gallery/[id]` renders a public reference page composed ONLY from safe data: the existing accepted `GalleryItemSummary` fields, an enriched `ProvenanceSummary`, and bounded curated detail metadata defined in Decision 3.
- The page NEVER renders `contentBlob`, `structureJSON`, raw captures, fingerprints, prompts, output hashes, evidence hashes, claimant evidence, or reviewer/private workflow data (ADR-0002 D7, ADR-0003 D9).
- No download/export, no carousel, no full-content modal, no source-page iframe, no live source probing, and no copying surface (NG1).
- Attribution, source URL, licence/consent basis, creator identity, and AI disclosure remain perceivable text and keyboard-reachable (policy §11, R3).

### Decision 2: Detail reads are guarded to publicly eligible records only

- The read path returns null/404 for: unknown IDs, non-ACCEPTED status, `complianceStatus = FLAG`, archived, suspended, rejected, pending-review items, items with revoked consent, and items with an active `RemovalRecord` (REQUESTED or EFFECTIVE).
- `notFound()` + noindex applies to hidden records. Removal/consent revocation is durable and immediately removes public visibility (ADR-0003 D7).
- Superseding attribution assertions update the public display (corrected creator/licence) without mutating historical records (R3).

### Decision 3: Additive bounded curated detail metadata with strict validation

New additive fields on `GalleryItem` (all nullable/default-safe, no guessed backfill):

- `desktopMediaUrl String?`, `mobileMediaUrl String?` — manually curated external HTTPS references validated by `MediaUrlSchema`; stable responsive presentation, no capture/upload/hosting system.
- `pageIndex String[] @default([])` — bounded ordered section labels (max 24, trimmed, max length enforced).
- `sections Json?` — bounded descriptors `{ key, label, present }`, never copied section prose.
- `strengths Json?` — bounded curated reason-code/descriptor objects from a finite set; never AI-generated freeform prose.
- `stackEvidence Json?` — bounded metadata `{ name, evidenceType }` where evidenceType is a finite enum (e.g. `metadata` | `capture`); never raw screenshots or source expressions.

A strict `PortfolioDetailSchema` composes these with the safe summary + provenance and rejects all prohibited fields.

### Decision 4: Similar examples are deterministic metadata overlap, not ranking

- Similar examples are computed from accepted/non-FLAG/non-removed items by normalized overlap on `styleTags` and `stackTags`.
- Results are capped (default 4), ordered by overlap count then reviewedAt then id, with attribution preserved.
- No flywheel ranking, `PatternSignal`, `StructuralLesson`, behavior events, or AI similarity in this path (ADR-0004; R2 remains for section-intelligence surfaces, not this read).

### Decision 5: Claim and removal/report controls reuse existing provenance workflows

- Owner claim uses the existing `OwnershipClaim` domain/service/repository; the public form stores `claimantContact` privately and never returns it.
- Removal/report is represented by the existing `RemovalRecord` request flow, surfaced to the user as "Request removal" — no new generic Report/Abuse model in this milestone.
- Public claim/removal POST routes require Cloudflare Turnstile server-side verification plus a deployment-backed rate-limit adapter (default 5 submissions per IP per 10 minutes plus a daily cap). No process-local-only production fallback.

### Decision 6: Implementation follows existing patterns

- Next.js 16 App Router dynamic segment `/gallery/[id]` with async `Promise` params, `generateMetadata`, segment `loading.tsx`, `error.tsx`, and `not-found.tsx`.
- API routes mirror `/api/gallery/summaries` (module-level service composition, `Cache-Control: no-store`, opaque error envelopes) and `/api/events` (injectable factory for tests).
- Telemetry: existing `OPEN` event only; no page-view events, no media/source URLs or claimant data in payloads.
- UI consumes existing tokens/primitives (Button/Card/Badge/Sheet) with the Taste Skill gate; no new accent family, no raw colors, no em-dashes in new copy.

## Consequences

### What this enables

- An informative, attributable reference page for accepted portfolios that preserves the gallery's inspiration-without-cloning promise.
- Safe owner-claim and removal/report intake without building a moderation inbox, CMS, or content viewer.

### What this constrains

- Public detail output is strictly limited to safe DTO fields; prohibited-field tests enforce this.
- Public claim/removal intake requires Turnstile and a real rate-limit binding; deployment must provision them.
- No generic report model, no ranking-based similar examples, no downloads/carousel/full-content modal.
- ADR-0006 remains historically accepted for the card system; this ADR supersedes only its detail-route surface decision (per decision-log D-9).

## Alternatives considered

### Alternative: Build a full portfolio content viewer (rejected)

Would expose structure/content and create a copying surface, violating ADR-0001/0002 D7 and NG1. Rejected; this ADR explicitly keeps the reference surface metadata-only.

### Alternative: Add a generic Report/Abuse model (deferred)

The existing `RemovalRecord.reason` covers the abuse/removal intake needed here. A general report model with moderation workflow is a separate future feature requiring its own ADR.

### Alternative: Ranking-driven similar examples (rejected)

Behavior/ranking similarity would violate the deterministic, attribution-preserving intent and create rich-get-richer dynamics; metadata overlap is deterministic, bounded, and independent.

## Related

- `docs/product/decision-log.md` — D-9 supersedes the D-8 no-detail-route surface ban (append-only; D-8 text unchanged).
- `docs/adr/0006-portfolio-card-media-metadata.md` — card-system boundary, superseded only at the detail-route surface.
- `docs/adr/0001-product-charter-and-anti-cloning-boundary.md`, `docs/adr/0002-gallery-schema-design.md`, `docs/adr/0003-provenance-and-originality-policy.md`, `docs/adr/0004-data-flywheel-and-ranking-feedback.md`, `docs/adr/0005-design-token-architecture.md`.
- `docs/product/originality-rules.md` — R1-R8.
- `docs/product/provenance-and-originality-policy.md` — §7 attribution, §8 owner claim and removal, §11 UI disclosure.
- `.sisyphus/plans/portfolio-detail-page.md` — the plan this ADR operationalizes.
