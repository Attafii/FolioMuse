# ADR-0006: Portfolio card media metadata — curated HTTPS screenshot reference and bounded stack tags

Date: 2026
Status: Accepted

## Context

Section 02 (Experience design) requires a portfolio card system that presents screenshots and high-value metadata consistently across dense galleries: stable media ratios, responsive images, creator/title, role, style, stack, freshness, source availability, bookmark, and preview behavior — with touch parity, keyboard interaction, and no layout shift.

The existing `GalleryItem`/`GalleryItemSummary` contracts carry `title`, `creatorRole`, `styleTags`, quality/compliance/status, attribution, and consent metadata, but no screenshot/media reference and no stack (technology/tooling) metadata. The shared `GalleryCard` (`src/components/gallery-card.tsx`) is metadata-only and links to the attributed `sourceUrl`. Satisfying the card-system objective therefore requires two new metadata fields.

This ADR records the decisions for that additive data surface, consistent with the binding constraints already established by ADR-0001 (anti-cloning), ADR-0002 (safe schema, no exportable content blob), ADR-0003 (additive rollout without guessed provenance, safe projection boundary), ADR-0004 (privacy-minimized telemetry), and ADR-0005 (token-first design).

## Decision

### Decision 1: `mediaUrl` is a single, nullable, curated HTTPS reference

- `GalleryItem.mediaUrl String?` stores the URL of a manually curated external screenshot of the portfolio.
- It is **not** an upload, capture, proxy, CDN, or hosting system; it is a reference to an already-hosted image supplied by curation.
- Validation (Zod, `MediaUrlSchema`): HTTPS only; reject `javascript:`, `data:`, `file:`; reject localhost, loopback, and private-network hosts; cap length at 2048 characters.
- Existing rows stay `null` until curated — no guessed backfill (ADR-0003 D2).
- It is safe display metadata; it never carries content, raw captures, prompts, or claimant evidence, and it is never a replacement for the immutable `Attribution.sourceUrl`.

### Decision 2: `stackTags` is a bounded, semantically distinct string array

- `GalleryItem.stackTags String[] @default([])` stores tools/technologies (for example "React", "Tailwind"), distinct from `styleTags` (visual/structural descriptors such as "brutalist", "editorial").
- Validation: trimmed non-empty strings, each at most 64 characters, at most 10 tags.
- Default-empty rollout; no guessed backfill.

### Decision 3: Additive, reversible schema rollout

- Migration `add_gallery_item_media_url_and_stack_tags` adds exactly two columns via `ALTER TABLE ... ADD COLUMN` — nullable `mediaUrl TEXT` and `stackTags TEXT[] DEFAULT ARRAY[]::TEXT[]`.
- Rollback drops only those two columns; attribution, consent, audit, provenance, and content rows are untouched. Populated media/stack values are intentionally lost on rollback and must be exported by the operator first.
- No image processing, no srcset/derived-resolution storage, no content pipeline changes.

### Decision 4: Bookmark and preview stay client-side; preview never loads source pages

- Bookmarks are local-only browser persistence (no backend model, no API, no auth/sync).
- Preview reveals the same curated media image on hover/focus with an explicit touch/keyboard control; it never loads the attributed source page in an iframe or probes its availability. Source availability is the static presence of the required attribution link.

## Consequences

### What this enables

- A shared, media-led card system across the homepage and `/browse` with stable 16:9 media, responsive native image loading for arbitrary curated HTTPS hosts, stack metadata, freshness from `reviewedAt`, static source state, local bookmarks, and accessible preview.
- Full attribution/provenance preservation: media is additive display metadata alongside the immutable attribution record.

### What this constrains

- `next.config.ts` remote image allowlists are NOT broadened to arbitrary external hosts; cards use responsive native `<img>` for curated HTTPS URLs. A controlled CDN/allowlist that enables Next Image `srcset` is a future decision.
- No upload/capture/proxy/hosting infrastructure is introduced by this feature.
- No detail route, full-content modal, carousel, or download flow.
- Telemetry stays privacy-minimized: no media URL, source URL, creator PII, or bookmark contents in event payloads.
- Public projections never gain `contentBlob`/`structureJSON`/raw provenance fields (ADR-0001/0002/0003 unchanged).

## Alternatives considered

### Alternative: Add a `mediaBlob`/asset-storage system (rejected)

Storing uploaded image bytes or building an asset pipeline would expand scope to storage, upload, content validation, and hosting cost — explicitly out of scope for this card-system milestone. A curated HTTPS reference delivers the card objective with zero new infrastructure.

### Alternative: Derive screenshots by capturing/probing the source page (rejected)

Fetching the attributed page to capture or verify screenshots would create ingestion/capture complexity and legal/privacy risk (NG3, ADR-0003 safe projection). Source availability is static; no live probing.

### Alternative: Reuse `styleTags` for stack (rejected)

Stack (tools/technologies) and style (visual/structural descriptors) are semantically different metadata; overloading one field would corrupt facet derivation and card labeling. A separate bounded array keeps both accurate.

## Related

- `docs/product/decision-log.md` — D-7 and D-8 and the append-only product decision history; this ADR records the Section 02 card-system data decisions.
- `docs/adr/0001-product-charter-and-anti-cloning-boundary.md`, `docs/adr/0002-gallery-schema-design.md`, `docs/adr/0003-provenance-and-originality-policy.md`, `docs/adr/0004-data-flywheel-and-ranking-feedback.md`, `docs/adr/0005-design-token-architecture.md`.
- `prisma/schema.prisma` — `GalleryItem` (mediaUrl, stackTags).
- `src/domain/curation/schemas.ts` — `MediaUrlSchema`, `GalleryItemSummarySchema`.
- `.sisyphus/plans/portfolio-card-system.md` — the plan this ADR operationalizes.
