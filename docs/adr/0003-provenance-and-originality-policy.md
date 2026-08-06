# ADR-0003: Provenance and originality policy — entity/activity/agent provenance, consent/licence intersection, immutable attribution, claim/removal state machines, and derivative rebuild protocol

Date: 2026
Status: Accepted

## Context

ADR-0001 established the anti-cloning boundary and mandated that attribution/provenance metadata "travel with content through any retrieval/embedding pipeline" and be treated as a required field, not optional metadata. ADR-0002 designed the gallery schema around source-item vs. pattern-signal separation, tiered consent, append-only audit, and a no-exportable-content-blob rule — but it deliberately left provenance-specific concerns unresolved: how provenance is captured and modelled (W3C PROV-O shape), how licence and consent intersect, how creator identity is canonicalized, how AI contributions are disclosed without storing raw content, how ownership claims and removals are adjudicated, how derivatives are invalidated and rebuilt after a removal, and what exactly a "safe projection" may expose.

This ADR resolves those open questions. It is the architectural implementation of `docs/product/provenance-and-originality-policy.md` (the binding policy) and operationalizes originality rules R2, R3, R5, R6, and R8's schema-readiness.

The policy document and this ADR are written together; this ADR records the binding decisions, and the policy doc expresses them as normative MUST/MUST NOT rules.

## Decision

### Decision 1: Provenance is modelled as entity/activity/agent per W3C PROV-O

Provenance records follow the PROV-O shape: an **entity** (the artifact — a `GalleryItem`, a `PatternSignal`, or future suggestion/portfolio content), an **activity** (the act that produced or modified it — capture, curation, AI generation, suggestion application), and an **agent** (the human or AI actor that performed the activity).

Concretely:

- `Creator` is the canonical agent identity for human creators.
- `SourceRecord` captures the capture activity: capture mode, submitted URL, normalized canonical URL, captured-at timestamp, optional evidence hash.
- `AiProvenance` captures AI generation activity: provider, model name, generation timestamp, disclosure status, and **hashes** of prompt and output (never raw prompt/output — see Decision 4).
- `ConsentRecord` remains the permission-grant activity (ADR-0002 Decision 2), extended with `revokedAt` (see Decision 3).
- `OwnershipClaim` and `RemovalRecord` capture adjudication activities (see Decisions 6 and 7).
- `AuditEntry` (ADR-0002 Decision 4) remains the immutable activity log for all curation events.

### Decision 2: Additive rollout — no backfill of guessed provenance

New provenance fields and relations are added **additively and nullable**. Pre-policy rows are not backfilled with guessed creators, inferred licences, or invented consent. Where a disclosure status is unknown, it is recorded as `UNKNOWN` — never assumed to be `HUMAN`.

Rationale: backfilling guesses would fabricate provenance — a compliance failure per the policy. A nullable rollout means the schema ships without a data migration risk, and existing curation tests remain non-breaking.

### Decision 3: Permission is the intersection of licence, consent, and policy; consent is revocable

- Effective rights = `licence ∩ consent tier ∩ policy`, computed as a derived result at read time — never stored as a mutable free-text permission field that could contradict the licence.
- A consent tier never expands licence-granted rights. `PATTERN_DERIVE` consent does not override a NoDerivatives licence.
- **NoDerivatives (ND)** items are `DISPLAY_ONLY` for pattern-derivation regardless of consent.
- **NonCommercial (NC)** items are display-only until FolioMuse's commercial-use posture is decided (deferred — see Open questions).
- `ConsentRecord.revokedAt` records revocation; the original grant row is preserved (never overwritten). Revocation triggers archiving and derivative invalidation (Decision 8).

### Decision 4: AI metadata minimization

`AiProvenance` stores metadata and hashes — never raw prompts, raw outputs, or content snapshots:

- `promptHash`, `outputHash`, provider, model name, generation timestamp, `disclosureStatus` (`HUMAN` / `AI_ASSISTED` / `AI_GENERATED` / `UNKNOWN`).
- Raw content may contain user secrets or third-party expression; it must never enter provenance records, telemetry, or public projections.

### Decision 5: Canonical creator policy — explicit creation only

- Each source item links to a canonical `Creator` record.
- Canonicalization is **explicit creation only** — no fuzzy name-matching, no auto-merge. Duplicate or lookalike creators are a curation-time decision, not an automated one.
- `Creator.verificationStatus` defaults to `UNVERIFIED`; verified identity (W3C Verifiable Credentials) is deferred.
- Attribution is **immutable** (R3). Corrections are handled by **superseding provenance assertions** with audit linkage, never by mutating the historical record.

### Decision 6: Ownership claim state machine

```
PENDING → UNDER_REVIEW → ACCEPTED | REJECTED
PENDING → SUSPENDED        (credible claim: immediate emergency hold, full review within runbook window)
UNDER_REVIEW → ACCEPTED | REJECTED
ACCEPTED → SUSPENDED | ARCHIVED (per disposition)
PENDING | UNDER_REVIEW → WITHDRAWN (claimant withdraws)
```

- Claims do not auto-transfer ownership; they enter `PENDING` review.
- Resolution requires an authorized resolution command recording `resolvedBy` (actor + role), `resolvedAt`, and `resolution`.
- Claimant evidence and reviewer identity are **private** — never in gallery summaries, telemetry, or MCP outputs.

### Decision 7: Removal is durable, never a hard delete

- Removal states: `REQUESTED` → `EFFECTIVE` → `COMPLETED` (with `ARCHIVED` / `SUSPENDED` / `REJECTED` as disposition states on the item).
- Source items, attribution, consent records, `RemovalRecord`s, and audit history are **durable** — never hard-deleted (legal/audit basis).
- Only derived, purgeable data (ephemeral caches/embeddings) may be purged, and future adapters must implement purge-on-removal.

### Decision 8: Derivative rebuild protocol

When a source item is removed (consent revocation, accepted removal, or suspension):

1. Source/audit/consent rows remain durable.
2. All `PatternSignal`s referencing the item are marked stale immediately (`staleSince`), `rebuildState` → `STALE_PENDING_REBUILD`.
3. A rebuild decision is queued asynchronously and idempotently (idempotency key = removal record id + pattern signal id).
4. Rebuild recomputes the signal from remaining eligible sources.
5. **R2 floor strengthened**: a signal requires **≥3 eligible items AND ≥2 distinct creators** (diversity floor — deliberate strengthening of R2's N ≥ 3, which counted items only). If the floor is not met, the signal enters `DROPPED_BELOW_FLOOR` and is excluded from active suggestions — not physically deleted.
6. Rebuild completes with bounded retries and must not trigger model calls in this feature. `REBUILD_FAILED` is a telemetry event.

### Decision 9: Safe projection boundary

- No public, API, or MCP contract may return `contentBlob` + `structureJSON` together (ADR-0002 Decision 7).
- No public contract may expose raw source captures, fingerprints, prompts, or claimant evidence.
- `StructuralLesson` output is limited to aggregate statistics (counts, distributions, descriptors) across ≥3 eligible items from ≥2 distinct creators — never a single source's expression.
- The MCP surface must not expose a "fetch full gallery item content" tool (ADR-0001).

## Consequences

### What this enables

- **Provable provenance**: every artifact is attributable; every permission is auditable; every AI contribution is disclosed.
- **Compliant removal**: removal without destruction satisfies legal/audit obligations while derivative data is invalidated and rebuilt deterministically.
- **Stronger anti-cloning posture**: the diversity floor (≥2 creators) closes a single-creator aggregation loophole; the safe-projection boundary prevents any client from chaining reads into a verbatim copy.
- **Schema readiness for R8**: `structureFingerprint`/`contentHash` remain reserved; provenance tables add no originality-computation dependency.

### What this constrains

- **No automated canonicalization**: creator merging is a human curation decision.
- **No hard deletes**: removal is durable; row count grows monotonically (consistent with ADR-0002).
- **No derivation from ND/NC items**: display-only items cannot contribute to pattern signals.
- **Rebuild requires a floor**: signals that cannot meet the floor are dropped below floor, not repaired by weakening R2.
- **MCP read surface is limited**: no tool returns full gallery content (consistent with ADR-0001/0002).

### Open questions (explicitly deferred)

1. **Commercial-use posture for NC items** — whether/when FolioMuse may use NC-licensed items commercially. Deferred; NC items remain display-only.
2. **Data-retention duration** for attribution, consent, and audit records (ADR-0002 open question 3). No retention duration is invented by this policy; documented as open.
3. **Originality-score algorithm and enforcement level** (ADR-0002 open questions 1–2) — unchanged.
4. **Crawler/API-partner ingestion modes** — deferred; no scraping in this feature (NG3).
5. **Verified creator identity (W3C VC)** — deferred.

## Alternatives considered

### Alternative: Store permission as a resolved enum field (rejected)

Precompute and store an "effective permission" enum (`DISPLAY_ONLY` / `PATTERN_DERIVE` / `FULL`) on the item at capture time.

Rejected because: a stored permission field silently diverges from the licence when either side changes, and invites a future code path to edit permission directly instead of consulting licence × consent. Deriving permission at read time from immutable inputs keeps the licence as the single source of truth.

### Alternative: Fuzzy creator canonicalization (rejected)

Auto-merge creator records by name similarity (e.g., "J. Smith" and "John Smith").

Rejected because: auto-merge can attribute one creator's work to another — a provenance integrity failure (R3). Canonicalization is explicit and human-adjudicated.

### Alternative: Soft-delete rows on removal (rejected)

Mark removed items with a `deletedAt` flag and purge them after a retention window.

Rejected because: the policy's durable-audit requirement (Decision 7) treats source/attribution/consent rows as legal evidence that must survive removal; soft-delete-with-purge implies eventual destruction. Removal state records the lifecycle while rows stay durable.

### Alternative: Rebuild synchronously in the removal transaction (rejected)

Recompute affected pattern signals inline when a removal commits.

Rejected because: rebuilds depend on remaining-source scans that can be slow and are not needed for removal consistency; async idempotent rebuild (Decision 8) keeps removal fast and retryable without holding a transaction.

## Related

- `docs/product/provenance-and-originality-policy.md` — the binding policy this ADR implements.
- `docs/adr/0001-product-charter-and-anti-cloning-boundary.md` — mandates source/pattern separation and the no-content-blob rule (not superseded; Decision 9 reinforces it).
- `docs/adr/0002-gallery-schema-design.md` — tiered consent, append-only audit, status lifecycle (not superseded; Decisions 1–3 extend it).
- `docs/product/originality-rules.md` — R2 (diversity floor strengthened), R3 (attribution immutability), R5 (agent writes only user-owned content), R6 (AI disclosure).
- `docs/product/decision-log.md` — D-5 records the product-level decisions (append-only).
- External standards: W3C PROV-O (Decision 1), Creative Commons/SPDX licence vocabulary (Decision 3), C2PA/CAI (future manifests, deferred), W3C Verifiable Credentials (deferred).
