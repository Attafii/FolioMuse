# FolioMuse — Provenance and Originality Policy

Status: Draft v1 (Section 01 · Product foundation)
Parent document: `docs/product/charter.md`
Related ADR: `docs/adr/0003-provenance-and-originality-policy.md`

This policy is **binding** on any feature that ingests, stores, displays, or derives from gallery content, section intelligence, or the MCP agent experience. It operationalizes the originality rules (`docs/product/originality-rules.md`, R1–R8) and the anti-cloning boundary (`docs/adr/0001-product-charter-and-anti-cloning-boundary.md`) into concrete provenance requirements: every artifact must be attributable, every permission must be provable, every AI contribution must be disclosed, and inspiration must be reusable without enabling copying.

---

## 0. Normative language

- **MUST** / **MUST NOT** = absolute requirement. A feature that violates a MUST/MUST NOT is rejected or amended before merge.
- **SHOULD** / **SHOULD NOT** = strong recommendation; deviation requires a documented decision-log entry.
- **MAY** = optional.

---

## 1. Artifact classes

FolioMuse tracks four artifact classes, with distinct provenance obligations:

| Class | Examples | Provenance obligation |
|---|---|---|
| **Source item** | A gallery `GalleryItem` with full attribution | Complete provenance REQUIRED (creator, source, capture, consent, licence, AI disclosure) |
| **Derived signal** | A `PatternSignal` aggregating multiple source items | Aggregated, anonymized; MUST satisfy R2 floor; attribution preserved as aggregated references only |
| **User portfolio content** | Content written/dictated by the user or synthesized per R2/R5 | AI/agent authorship disclosed (R6); provenance of *inspiration* (patterns) recorded at suggestion level |
| **Suggestion/feedback** | Section-intelligence guidance | MUST be grounded in ≥3 eligible sources (R2); attribution-referenced, never content-copied |

---

## 2. Source discovery

### 2.1 Capture modes

Each captured artifact MUST record its discovery/capture mode. Supported modes (v1):

- `MANUAL_SUBMISSION` — a human submitted the item directly.
- `URL_SUBMISSION` — a human submitted a source URL for review.
- `BROWSER_ASSIST` — assisted capture with explicit human confirmation.

Future modes (`CRAWLER`, `API_PARTNER`) are **deferred**. No feature MAY implement automated crawling/scraping of third-party portfolios without (a) an approved ADR, (b) robots/ToS evaluation, and (c) explicit consent capture — see NG3 and R4.

### 2.2 Minimum capture evidence

A source item MUST NOT enter the gallery without:

1. A canonical creator identity (`Creator` record).
2. A source record capturing: original `sourceUrl`, normalized `canonicalUrl` (for duplicate detection), capture mode, captured-at timestamp, and an optional evidence hash.
3. A valid `ConsentRecord` (see §3).
4. A licence identifier (see §5).
5. AI-contribution disclosure (see §6), including "none" (human-authored).

Evidence hash MUST be derived from the captured content; raw evidence blobs are private (see §8).

### 2.3 URL handling

- Source URLs MUST be validated (strict scheme allowlist: `https`, `http` for redirects; credentials and dangerous schemes rejected).
- A normalized canonical URL is stored separately from the submitted URL; the submitted URL is preserved as evidence.
- Future capture adapters MUST enforce SSRF protections. No scraper is implemented in this feature.

---

## 3. Consent

### 3.1 Consent tiers

| Tier | Meaning | Permits |
|---|---|---|
| `DISPLAY` | Display in gallery only | Display, browsing, attribution display |
| `PATTERN_DERIVE` | Derivation for pattern signals permitted | All of DISPLAY + aggregation into structural lessons/signals |
| `FULL` | Unrestricted within FolioMuse's anti-cloning guardrails | All of the above + broader internal use |

### 3.2 Consent requirements

- Consent MUST be auditable: who (`consentedBy`), when (`consentedAt`), under what terms (`terms`), and expiry (`expiresAt`, nullable).
- Consent MUST be revocable. Revocation MUST record `revokedAt` on the `ConsentRecord` (the original grant is preserved, never overwritten).
- Revocation MUST propagate: the item is archived, derived signals referencing it are invalidated, and rebuild decisions are queued (see §9).
- **Permission is the intersection of licence, explicit consent, and policy.** A consent tier NEVER expands the rights granted by the licence. `PATTERN_DERIVE` consent does not override a `NoDerivatives` licence.

### 3.3 Prohibited consent

- Consent obtained through scraping without the creator's explicit grant is prohibited (NG3, R4).
- Fabricated or backdated consent records are compliance failures and telemetry events.

---

## 4. Capture policy

- Capture MUST NOT occur without the evidence requirements of §2.2.
- Capture MUST NOT store raw prompt bodies, full source HTML snapshots, or credentials as public data (see §8 privacy).
- Captured evidence that may contain user secrets or third-party expression MUST be stored hashed or private, never exposed through public projections, telemetry, or MCP outputs.
- Duplicate detection uses normalized canonical URLs; duplicate submissions MUST be handled per the curation rubric (DUPLICATE / variant / cross-clone), never silently re-ingested.

---

## 5. Licence

### 5.1 Licence vocabulary

- Licence identifiers MUST use the full Creative Commons set plus SPDX-compatible machine-readable IDs, stored as strings (vocabulary evolves via Zod, not DB enums).
- `licenseType` on `Attribution` remains valid and is the declared licence of the source item.

### 5.2 Compatibility

- **NoDerivatives (ND)** licences MUST NOT permit derivation: a source item with an ND licence is `DISPLAY_ONLY` for pattern-derivation purposes regardless of consent tier.
- **NonCommercial (NC)** licences MUST NOT permit commercial derivation. NC items are display-only until FolioMuse's commercial-use posture is decided (deferred decision; recorded in ADR-0003).
- Compatibility is computed as a derived result (licence × consent × policy), never stored as a mutable free-text field that could contradict the licence.

### 5.3 Prohibited licence practices

- Inventing a licence for a source item is prohibited.
- Broadening a licence after capture (e.g., upgrading `CC_BY` to `CC_BY` + commercial rights) without new creator consent is prohibited.

---

## 6. AI provenance

### 6.1 Disclosure obligations (R6)

- Any artifact created or substantially modified by an AI agent or an "apply suggestion" action MUST carry AI provenance: model provider, model name, generation timestamp, disclosure status.
- `disclosureStatus` values: `HUMAN` (no AI contribution), `AI_ASSISTED` (AI contributed to part of the content), `AI_GENERATED` (content primarily AI-produced). Existing pre-policy items are marked `UNKNOWN` (no backfill guessing).
- Missing AI disclosure on newly ingested items is a compliance failure.

### 6.2 Metadata minimization

- `AiProvenance` stores **hashes** of prompts and outputs (`promptHash`, `outputHash`) plus model metadata — never raw prompts or raw generated content.
- Raw content may contain user secrets or third-party expression; it MUST NOT be stored in provenance records.

### 6.3 Scope

AI provenance applies generically to: gallery source items, derived signals, future section suggestions, and MCP-agent edits. The provenance shape is entity/activity/agent per W3C PROV-O.

---

## 7. Creator attribution (R3)

### 7.1 Canonical creator

- Each source item links to a canonical `Creator` record. Canonicalization is **explicit creation only** — no fuzzy name-matching.
- `Creator.verificationStatus` defaults to `UNVERIFIED`; verified-identity flows (including W3C Verifiable Credentials) are deferred.

### 7.2 Attribution integrity

- Attribution MUST travel with content through any processing pipeline (embeddings, retrieval, display, feedback grounding) — a pointer back to source + attribution is retained.
- Attribution is **immutable** (R3). Legitimate corrections MUST be handled by a **superseding provenance assertion** with audit linkage — never by mutating the historical attribution record.
- Public projections resolve the latest accepted superseding assertion; history remains durable.

### 7.3 Attribution display

Wherever an artifact is displayed or referenced, attribution MUST be retrievable and displayed with the content: creator identity, source reference, licence/permission basis, and AI-disclosure status.

---

## 8. Owner claim and removal

### 8.1 Ownership claims

- A creator (or authorized claimant) MAY file an ownership claim against a source item.
- Claims MUST NOT auto-transfer ownership. Claims enter `PENDING` review; a credible claim MAY place the item into `SUSPENDED` immediately (dispute state), with full review required within the runbook window.
- Claim states: `PENDING`, `UNDER_REVIEW`, `ACCEPTED`, `REJECTED`, `WITHDRAWN`.
- Claim resolution requires an authorized resolution command (actor identity + role) and records `resolvedAt`, `resolvedBy`, `resolution`.

### 8.2 Removal states

- Removal is distinct from deletion. Source items, attribution, consent records, and audit history are **durable** — they are never hard-deleted (legal/audit basis).
- Removal states: `REQUESTED` → `EFFECTIVE` → `COMPLETED`.
- `ARCHIVED` = removed from active circulation; `SUSPENDED` = emergency/dispute hold during review; `REJECTED` = editorial rejection (never accepted into circulation).

### 8.3 Privacy of claim evidence

Claimant contact data, ownership proof, reviewer identity, and legal correspondence are **private**. They MUST NOT enter gallery summaries, telemetry payloads, or MCP outputs.

---

## 9. Derivative deletion/rebuild rules

### 9.1 Invalidation

When a source item is removed (consent revocation, accepted removal, or suspension):

1. The source/audit/consent rows remain durable.
2. All derived `PatternSignal`s referencing the item are marked stale immediately (`staleSince`), and `rebuildState` transitions to `STALE_PENDING_REBUILD`.
3. A rebuild decision is queued asynchronously and idempotently (idempotency key = removal record id + pattern signal id).

### 9.2 Rebuild

- Rebuild recomputes the signal from its remaining eligible sources.
- **R2 floor**: a signal requires ≥3 eligible items AND ≥2 distinct creators. If the floor is not met after removal, the signal enters `DROPPED_BELOW_FLOOR` and is excluded from active suggestions — it is not physically deleted.
- Rebuild MUST complete with bounded retries and MUST NOT trigger model calls in this feature. `REBUILD_FAILED` state is a telemetry event.

### 9.3 Prohibited laundering

The following do NOT make copied expression permissible (R1, NG1, NG4):

- Re-attributing copied content to a different creator.
- Translating or paraphrasing source text.
- Cropping or re-rendering source assets.
- Routing source content through an AI model.

Any pipeline that performs these on another creator's expression without consent is prohibited.

### 9.4 Ephemeral caches

Ephemeral embeddings/caches derived from source content MUST be purgeable under this policy's contracts; future adapters MUST implement purge-on-removal.

---

## 10. Allowed structural lessons and prohibited copying

### 10.1 Structural lessons

Section intelligence MAY derive and expose **aggregated structural lessons** — the "why it works" — from source items, subject to:

- Aggregation across **≥3 eligible source items** (R2).
- **≥2 distinct creators** (deliberate strengthening of R2 — see ADR-0003 and decision-log D-5).
- Output is limited to aggregate descriptors, counts, and distributions — never a single source's expression.
- Attribution is preserved as aggregated references.

### 10.2 Prohibited copying

- Exposing a source item's full content + structure + asset set as a single exportable unit (NG1).
- Exposing `structureJSON` + `contentBlob` simultaneously through any public contract.
- Exposing raw source captures, fingerprints, or prompts through public contracts.
- Suggestions that paraphrase a single source item verbatim (R2 fallback: general structural principles only).
- MCP tools that fetch full gallery item content for chaining into a copy (ADR-0001).

### 10.3 Idea–expression dichotomy

Style, visual mood, and common section names are **not** exclusive creator-owned expression; the *expression* of those ideas is protected. Deriving structural lessons from ideas is permitted; reproducing expression is not.

---

## 11. Future UI/API/MCP disclosure obligations

These obligations bind any future surface that displays gallery content, provenance, or suggestions. No UI is built by this feature; when UI is built, the Taste Skill design protocol applies (AGENTS.md §3).

- **Attribution** MUST be perceivable text (not icon-only).
- **Source links** MUST have descriptive labels.
- **Status** (licence, consent, removal, AI) MUST NOT rely on color alone.
- **Disclosures** MUST be keyboard-reachable and announced to assistive technology.
- **Long values** (creator, licence, source) MUST wrap correctly at 390px viewport.
- API and MCP outputs MUST use the safe projection contract (ADR-0003, §8/§10); never raw content.

---

## 12. Telemetry and privacy

- Emit structured, privacy-minimized events for: incomplete provenance, prohibited export attempts, claim creation/resolution, removals, consent revocation, pattern invalidation, rebuild success/failure, and floor failure.
- Include IDs, enum reasons, counts, durations. Exclude raw prompts, content, URLs with query strings, claimant evidence, email addresses, legal text.

---

## 13. Non-goals (this policy does not)

- Define or enforce a data-retention duration (open ADR-0002 question — documented, not invented here).
- Implement scraping/crawling, AI inference, signed C2PA manifests, or W3C credentials.
- Automatically adjudicate ownership or copyright law.
- Compute an originality score (R8 reserved; algorithm deferred).

---

## 14. Cross-references

- `docs/product/charter.md` — NG1, NG3, NG4; §7 non-goals; §10 originality rules.
- `docs/product/originality-rules.md` — R1–R8 (this policy operationalizes R2/R3/R5/R6).
- `docs/product/content-quality-principles.md` — quality baseline for source items.
- `docs/product/curation-rubric.md` — acceptance, rejection reasons, duplicate handling, stale content.
- `docs/product/reviewer-runbook.md` — claim intake, emergency suspension, revocation workflows.
- `docs/adr/0001-product-charter-and-anti-cloning-boundary.md` — source/pattern separation, no content blob export.
- `docs/adr/0002-gallery-schema-design.md` — tiered consent, append-only audit, status lifecycle.
- `docs/adr/0003-provenance-and-originality-policy.md` — decisions implementing this policy.
- `docs/product/decision-log.md` — D-5 (this policy's decisions).
- External standards: W3C PROV-O, C2PA/CAI, Creative Commons, SPDX, W3C VC (future).
