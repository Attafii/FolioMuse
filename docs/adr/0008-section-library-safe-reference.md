# ADR-0008: Section library safe reference — curated section taxonomy, first-class section records, pre-generated crops, aggregated lessons, and local collection actions

Date: 2026
Status: Accepted

## Context

Section 02 (Experience design) requires a Section Library and Section Detail surface: let users browse heroes, project grids, timelines, contact CTAs, and other reusable patterns independently, with section taxonomy, section cards, filters, full context, crop/screenshot, transferable lessons, do-not-copy notes, portfolio link, similar sections, and collection actions.

Today the homepage `SectionExplorer` derives chips from `styleTags` as a proxy; there is no real section taxonomy and no first-class section records. `GalleryItem` carries per-item media and detail metadata (ADR-0006/0007), and the provenance domain provides the R2-aggregated `StructuralLesson` surface with a >=3-item / >=2-creator floor. The flywheel closed vocabulary already includes `COLLECTION_ADD` (weight 4), and `useLocalBookmarks` establishes the local-only collection pattern.

This ADR records the decisions for a safe, independent section reference surface that extends the gallery experience without weakening any anti-cloning, safe-projection, attribution, consent, or privacy rule established by ADR-0001..0007.

## Decision

### Decision 1: Curated closed section taxonomy

- A closed vocabulary of section types (hero, project grid, timeline, contact CTA, about, footer, stats, navigation, gallery, testimonial) is the source of truth for browsing and filtering.
- `sectionType` is validated by a Zod enum at read/write boundaries; free text is never accepted.
- `styleTags` remain a separate style dimension (ADR-0006), not a section taxonomy.

### Decision 2: First-class SectionRecord

- A `SectionRecord` model persists: id, `sectionType`, nullable `desktopCropUrl`/`mobileCropUrl` (validated by `MediaUrlSchema`), bounded `lessons` (JSON of curated reason-code lessons), bounded `notes` (curator-authored do-not-copy guidance), `itemId` FK to `GalleryItem` (onDelete: Restrict, durable), and timestamps.
- Section records are additive; no raw `contentBlob`, `structureJSON`, DOM snapshots, or raw captures are stored.

### Decision 3: Crops are pre-generated curated references

- Desktop/mobile crop references are curated HTTPS URLs validated by `MediaUrlSchema`; there is NO on-demand screenshot/capture, NO live source probing, and NO capture/upload pipeline in this feature.

### Decision 4: Full context is a safe projection

- "Full context" for a section = high-fidelity crop + section taxonomy metadata + curated transferable lessons + R2-aggregated lesson output when the floor is met + provenance/attribution + do-not-copy notes + portfolio link.
- NEVER raw DOM, page content, or `structureJSON` (ADR-0002 D7, ADR-0003 D9).

### Decision 5: Transferable lessons are curated + aggregate-floored

- Curated reason-code lessons (e.g. CLARITY, HIERARCHY, FOCUS, MOTION, ACCESSIBILITY) are always shown.
- Aggregate-shaped lesson output is only shown when the R2 floor is met (>=3 eligible items AND >=2 distinct creators); below floor shows "insufficient data".
- Never single-source prose (R2).

### Decision 6: Do-not-copy notes are curator-authored and bounded

- Short, bounded, curator/reviewer-authored notes framed as originality guidance; never user-generated warnings on others' work; never AI prose from a single source.

### Decision 7: Collection actions are local-only with existing telemetry

- Section collection toggles reuse the local-only bookmark store pattern (SSR-safe localStorage); no backend bookmarks/sync/auth.
- Adding a section to a collection fires the existing `COLLECTION_ADD` event (weight 4) with a flat payload `{ source: "section_library", context: "section" }`; removal is local state (no UNSAVE vocabulary).
- Telemetry never carries content, URLs, or data that could reconstruct user interest profiles.

### Decision 8: Similar sections are deterministic metadata overlap

- Similar sections are computed deterministically from sectionType + parent style/stack tag overlap, capped (default 4), ordered deterministically, with attribution preserved; NO ranking/flywheel/PatternSignal dependency.

### Decision 9: Eligible-only public reads

- Section browse/detail only expose sections whose parent item is ACCEPTED, non-FLAG, not removed, and not consent-revoked; hidden records return notFound/noindex, mirroring the portfolio-detail guards.

## Consequences

### What this enables

- An independent, safe section reference surface that helps builders study reusable patterns without copying.
- Curated taxonomy + section records + aggregated lessons + local collections, all consistent with existing provenance/originality/telemetry constraints.

### What this constrains

- No raw content/structure/DOM exposure; no export/generate-code; no "apply to my portfolio"; no on-demand capture; no backend collections; no raw-content search; no admin crop UI; no user-authored notes.
- Taxonomy is closed; novel types require a future curation/admin decision.
- Lessons respect the R2 floor; similar sections are deterministic and capped.

## Alternatives considered

### Alternative: Derive sections from styleTags (rejected)

styleTags are a style dimension, not a section taxonomy; deriving sections from them would conflate unrelated concepts and prevent independent browsing.

### Alternative: Project sections from GalleryItem.sections descriptors (rejected)

Per-item descriptors cannot carry crops, lessons, notes, and provenance independently; a first-class SectionRecord is required for independently curated reference data.

### Alternative: On-demand screenshot/capture (rejected)

Violates the no-live-probing and no-capture-pipeline constraints; crops are pre-generated curated references only.

## Related

- `docs/product/decision-log.md` — D-10 (append-only; D-1..D-9 unchanged).
- `docs/adr/0006-portfolio-card-media-metadata.md`, `docs/adr/0007-portfolio-detail-safe-reference.md` — card/detail safe-reference surfaces this extends.
- `docs/adr/0001-product-charter-and-anti-cloning-boundary.md`, `docs/adr/0002-gallery-schema-design.md`, `docs/adr/0003-provenance-and-originality-policy.md`, `docs/adr/0004-data-flywheel-and-ranking-feedback.md`, `docs/adr/0005-design-token-architecture.md`.
- `docs/product/originality-rules.md` — R1-R8.
- `docs/product/provenance-and-originality-policy.md` — §7 attribution, §8 owner claim and removal, §11 UI disclosure.
- `.sisyphus/plans/section-library-detail.md` — the plan this ADR operationalizes.
