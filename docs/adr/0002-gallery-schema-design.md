# ADR-0002: Gallery schema design — source item vs. pattern signal separation, consent, attribution, audit, and status lifecycle

Date: 2026
Status: Accepted

## Context

ADR-0001 established the anti-cloning boundary and explicitly mandated that the gallery schema separate "source item" (with attribution) from "pattern/derived signal" (aggregated, anonymized) as distinct persisted concepts. It deferred the detailed schema design to "the ADR that introduces the gallery schema" — that ADR is this one.

Section 01 of the product foundation is defining the editorial curation rubric and the persistence layer for the human gallery. Before writing the actual Prisma schema (Task 8) or implementing the domain services, we need agreed, documented decisions on how the gallery's data model will enforce the product's non-negotiable constraints: no cloning (NG1/NG4), consent-gated ingestion (NG3/R4), attribution that travels with content (R3), auditability (R4), and originality-score computability (R8).

The seven decisions below define the schema-shaping rules. They are binding on the Prisma schema, domain interfaces, and repository implementations that follow.

## Decision

### Decision 1: Source item vs. pattern signal separation

**`GalleryItem` and `PatternSignal` are distinct persisted models.**

`GalleryItem` stores a source portfolio item with full attribution, consent metadata, review history, and a content reference (never exported raw alongside structure data). `PatternSignal` stores derived, anonymized pattern data used by section intelligence. `PatternSignal` links back to source items via a loose `derivedFromItemIds` field (an array of strings, not Prisma `@relation`), satisfying the ADR-0001 mandate that derived signals must come from aggregated sources (R2: N ≥ 3).

For Section 01, `PatternSignal` is a minimal stub: `id`, `derivedFromItemIds`, `patternType`, `staleSince`. The full retrieval and embedding mechanism belongs to Section 02+.

This separation ensures that:
- Attribution metadata is never accidentally shipped with derived pattern data.
- The MCP agent's read surface never sees `GalleryItem.contentBlob` and `GalleryItem.structureJSON` in the same object (Decision 7).
- Pattern signals can be independently marked stale when source items are archived or consent is revoked.

### Decision 2: Tiered consent model

**Consent is modelled as a `ConsentRecord` entity with a tiered rights enum, not a binary flag.**

Field | Type | Description
---|---|---
`tier` | enum: `DISPLAY`, `PATTERN_DERIVE`, `FULL` | What rights the creator granted
`consentedBy` | string (non-nullable) | Email or identifier of the person who consented
`consentedAt` | ISO datetime (non-nullable) | When consent was recorded
`terms` | enum: `CC_BY`, `EXPLICIT_PERMISSION`, `LICENSED` | Under what legal terms
`expiresAt` | ISO datetime (nullable) | Reserved for future time-bounded consent

Rationale: R4 requires "who consented, when, under what terms" — a binary `hasConsent` boolean is insufficient. The tiered model supports future granularity without migration: `DISPLAY` allows browsing-only display, `PATTERN_DERIVE` allows the item's structure to contribute to section-intelligence patterns, and `FULL` grants both. Every accepted gallery item requires at minimum `tier = DISPLAY`.

The `expiresAt` field is nullable and reserved. Time-bounded consent enforcement (auto-archiving expired items) is deferred to a future ADR.

### Decision 3: Attribution model with non-nullable foreign key

**`Attribution` is a separate entity with all non-nullable fields. `GalleryItem.attributionId` is a non-nullable foreign key.**

Field | Type
---|---
`creatorName` | string (non-nullable)
`sourceUrl` | string (non-nullable, unique)
`licenseType` | ConsentTerms enum (non-nullable)
`consentDate` | ISO datetime (non-nullable)

Rationale: R3 requires attribution to travel with content through any pipeline — making it a non-nullable FK at the schema level enforces this at the database, not by convention. The Zod schema for domain interfaces also enforces all attribution fields as required (no partial attribution records).

`sourceUrl` is unique: no two gallery items can reference the same URL. This is the basis for exact duplicate detection.

### Decision 4: Append-only audit log

**`AuditEntry` is an append-only model. The domain interface exposes only `createAuditEntry()`, never `update()` or `delete()`.**

The `action` enum covers all curation events: `INGEST`, `REVIEW`, `ACCEPT`, `REJECT`, `ESCALATE`, `OVERRIDE`, `ARCHIVE`, `SUSPEND`, `CONSENT_REVOKE`, `DUPLICATE_FLAG`, `RE_REVIEW`.

Each entry records `actorId`, `itemId`, `decision`, `rationale`, and `timestamp`. Rationale: audit integrity for consent enforcement (R4) and reviewer accountability requires immutability at the interface contract level. The database itself enforces no direct update/delete path through the repository.

### Decision 5: Originality-score computability fields

**`GalleryItem` includes nullable `structureFingerprint` and `contentHash` fields.**

These fields are schema placeholders. They make the schema ready for future originality-score computation per R8 without requiring a migration when the algorithm is decided. No similarity computation, no embedding pipeline, and no vector storage are built in Section 01.

The algorithm and threshold remain open questions (see Consequences).

### Decision 6: Status lifecycle

**`GalleryItem.status` follows this state machine:**

```
PENDING_REVIEW → ACCEPTED | REJECTED
ACCEPTED → PENDING_REREVIEW (creator update)
PENDING_REREVIEW → ACCEPTED | REJECTED
ACCEPTED → ARCHIVED (stale, 18 months since last review, or consent revoked)
ACCEPTED → SUSPENDED (emergency takedown, any reviewer)
SUSPENDED → ACCEPTED (post-review restoration) | ARCHIVED (permanent takedown)
REJECTED → PENDING_REREVIEW (creator revises and resubmits)
```

Transitions are enforced by `CurationService` domain logic, not database constraints. This keeps the constraints testable and auditable without coupling them to a specific database feature.

Key rules:
- An item with `ComplianceStatus = FAIL` cannot transition to `ACCEPTED`, regardless of quality score.
- Emergency takedown (`SUSPENDED`) is available to any reviewer immediately. Full review must follow within 48 hours.
- Consent revocation triggers `ARCHIVED` (not deletion). Associated `PatternSignal` records are marked stale via `staleSince`.
- Creator-initiated content updates trigger `PENDING_REREVIEW`. The re-review focuses on the delta but uses the same rubric.

### Decision 7: No exportable content blob

**Domain interfaces never return `contentBlob` and `structureJSON` in the same object.**

Interfaces that read gallery data return a `GalleryItemSummary` containing metadata + attribution only. The `contentBlob` and `structureJSON` fields are stored in the database but never returned together by any public or MCP-facing interface. This is a direct implementation of ADR-0001's mandate that "any gallery-read MCP tool must return pattern-level or attribution-display data, not a raw exportable content blob."

The repository implementation is responsible for this constraint. The `GalleryRepository.read()` method or its equivalent must strip one of the two fields before returning to any caller outside the internal review workflow.

## Consequences

### What this schema enables

- **Attribution enforcement by database constraint**: a `GalleryItem` cannot exist without an `Attribution` record. This is stronger than documentation or code review conventions.
- **Audit immutability by interface contract**: no code path can update or delete an `AuditEntry`. The Prisma model may technically allow it at the ORM level, but the domain interface disallows it, and tests will verify this.
- **Future originality-score computation**: the `structureFingerprint` and `contentHash` columns exist from day one. When the algorithm is decided (future ADR), the schema is already prepared.
- **Consent granularity**: the tiered model allows future features (e.g., "pattern only" browsing) without schema changes.
- **Pattern signal independence**: loose string references instead of Prisma relations prevent accidental joins that could surface attribution through derived data.

### What this schema constrains

- **No cheap "export" feature**: the content blob cannot be exported alongside structure in one call. Any feature that displays full gallery content must go through the review workflow, not a public API.
- **No bulk delete**: consent revocation and stale content handling use `ARCHIVED` status, never row deletion. The gallery corpus grows monotonically in terms of row count.
- **Status transitions are finite**: the state machine is manually enforced in domain logic. Adding a new status requires updating `CurationService` and all tests.

### Open questions (explicitly deferred)

1. **Originality-score algorithm and threshold**: what similarity metric, what threshold constitutes "too similar," and whether the computation uses `structureFingerprint`, `contentHash`, embeddings, or a combination of these. Deferred to a future ADR once the gallery corpus and section-intelligence retrieval mechanism exist.

2. **Publish-time enforcement level**: whether a publish attempt above the originality-score threshold is blocked, warned (with override option), or merely logged. R8 mandates "computed and logged" for v1; this ADR does not change that. The enforcement decision belongs to a future ADR.

3. **Data retention policy for gallery attribution records**: how long attribution metadata, consent records, and audit entries are retained after an item is archived or creator consent is revoked. No deletion occurs in v1; a retention policy will be designed when the gallery corpus reaches sufficient size.

## Alternatives considered

### Alternative: Single table with attribution as a JSON column (rejected)

Store `creatorName`, `sourceUrl`, `licenseType`, and `consentDate` as a JSON column on `GalleryItem` rather than a separate `Attribution` table with a non-nullable FK.

Rejected because:
- JSON columns cannot enforce non-nullability of individual fields at the database level.
- A separate table with a non-nullable FK means the database itself rejects any attempt to insert a gallery item without attribution. A JSON column requires application-level validation, which is strictly weaker.
- Querying "all items attributed to a specific creator" requires JSON extraction operators, which are less portable and harder to index.
- ADR-0001 and R3 treat attribution as a first-class concern, not optional metadata. A dedicated table reflects that priority.

### Alternative: Binary consent field on GalleryItem (rejected)

Use a single `hasConsent: boolean` column on `GalleryItem` instead of a tiered `ConsentRecord` entity.

Rejected because:
- R4 requires knowing "who consented, when, under what terms." A boolean captures none of this.
- Future features (pattern derivation consent, time-bounded consent, consent revocation with audit trail) require a separate entity anyway. Starting with a boolean would mean a migration later.
- The tiered model (`DISPLAY` / `PATTERN_DERIVE` / `FULL`) directly supports the product concept that browsing rights and derivation rights are distinct. A binary field collapses this distinction and would need to be retrofitted.

### Alternative: Audit as application logs only (rejected)

Rely on structured application logging (e.g., OpenTelemetry, CloudWatch, Datadog) for audit history instead of a persisted `AuditEntry` table.

Rejected because:
- Application logs are not durable in the same way a database table is. Log rotation, retention policies, and external service dependencies can lose audit data.
- The audit log is used for consent enforcement (R4) and reviewer accountability. It must be queryable alongside gallery data in the same database, not in a separate log aggregation system.
- The append-only interface contract (`createAuditEntry()` only) is enforceable with a database table. With external logs, any code path can emit any log line without a contract.

## Related

- `docs/adr/0001-product-charter-and-anti-cloning-boundary.md` — mandates the source-item vs. pattern-signal separation (Consequences §1), the no-exportable-content-blob rule (Consequences §2), and originality-score computability (Decision §4). This ADR is the schema design that ADR-0001 explicitly deferred.
- `docs/product/originality-rules.md` — R3 (attribution travels with content) informed Decision 3. R4 (consent-gated ingestion, auditable) informed Decision 2 and Decision 4. R8 (similarity monitoring at publish time) informed Decision 5.
- `docs/product/success-metrics.md` — the "attribution integrity" guardrail metric (% of gallery items with intact attribution at display time) is directly supported by the non-nullable FK in Decision 3. The "originality score" guardrail is supported by the reserved fields in Decision 5.
- `docs/product/charter.md` — NG1 (anti-cloning, no bulk export) informed Decision 1 and Decision 7. NG3 (consent-gated ingestion) informed Decision 2. NG4 (no verbatim single-source suggestions) informed Decision 1.
- `docs/adr/0002-gallery-schema-design.md` (this file) — will be referenced by the Prisma schema implementation (Task 8) and the domain service and repository implementations (Tasks 10, 11).
