# FolioMuse — Editorial Acceptance and Curation Rubric

Parent document: `docs/product/charter.md`
Status: Draft v1

> This document is the binding editorial standard for what enters FolioMuse's human gallery corpus. Every gallery item must pass through this rubric before it can be displayed, referenced by section intelligence, or used to ground pattern signals. Reviewers, automated checks, and domain logic must all enforce the rules described here. If a rule conflicts with the charter (`docs/product/charter.md`) or the originality rules (`docs/product/originality-rules.md`), the charter and originality rules take precedence and this document must be amended.

---

## 1. Quality Levels (L0–L4)

Quality is a structural and presentation-level assessment of a gallery item. It answers the question: "is this portfolio section well built, clear, and informative enough to serve as a pattern reference?" Quality is scored independently of compliance: a perfectly attributed item with valid consent can still score L0 if the content itself is poor.

Each level defines three things:
- **What it means**: the standard the item meets.
- **What an example looks like**: a calibrated, concrete scenario.
- **Which sections must be present**: the minimum section composition required at that level.

### L0 — Unusable

**What it means**: the item is too incomplete, too vague, or too poorly structured to serve as a pattern reference for anyone building a portfolio. No one could look at this item and extract a useful structural insight.

**Example**: a page with only a name and an email link, no project descriptions, no case-study structure, no navigation context. Or a densely text-walled page with no visual hierarchy, broken images, and a hero section that is blank or error-laden.

**Required sections**: none can be reliably identified. L0 items may lack any recognizable portfolio section altogether.

### L1 — Minimal

**What it means**: the item is recognizable as a portfolio but lacks depth in most sections. A reviewer can identify some intended sections, but the content inside them is thin (one-liners, placeholder descriptions, missing context). L1 items may serve as a reference for "what a section boundary looks like" but not for "what good content inside a section looks like."

**Example**: a portfolio that has a hero (name + tagline only), a single projects list (titles with no descriptions), and a contact link. The sections exist but contain almost nothing actionable.

**Required sections**: at minimum, a hero and one other section (projects, about, or contact) must be identifiable. Items with only a hero count as L0.

### L2 — Adequate

**What it means**: the item is a solid, representative portfolio. Sections are present, descriptions are substantive, and a reviewer can understand the creator's work and voice from the content. L2 is the minimum acceptance threshold for the gallery corpus. An L2 item shows a clear portfolio structure that a user could learn from, even if it lacks polish.

**Example**: a designer's portfolio with a hero (name, role, one-sentence summary), three project case studies (each with a problem statement, approach summary, and outcome or visual), an about section (a paragraph or two), and a contact section. The content is real and specific, not generic filler. Visual hierarchy is functional: headings exist, images are placed with purpose, and sections are clearly delineated.

**Required sections**: hero, at least two other sections (projects, case studies, about, or contact), and at least one project entry with a substantive description (not just a title and link). All sections must contain real content, not placeholder text.

### L3 — Strong

**What it means**: the item exceeds the baseline with depth, clarity, and intentional design. It would serve as a high-confidence reference for structure, tone, visual hierarchy, and content completeness. A reviewer can see deliberate choices in how the story is told, how sections connect, and how the creator positions their work.

**Example**: a developer's portfolio with a hero (role + a concrete value statement + a primary CTA), three or more detailed case studies (each with problem, approach, technologies used, results with metrics, and a visual or code snippet), a substantive about section (personal narrative + professional background), a contact section, and at least one additional section (testimonials, speaking, open-source contributions). Content is specific, the voice is consistent, and navigation between sections is clear.

**Required sections**: hero, at least three other sections (projects or case studies, about, contact, and one more), with every project entry containing detailed context (not just a title and screenshot). The about section must be substantive: at least a paragraph that connects background to current work.

### L4 — Exemplary

**What it means**: the item is a portfolio that could be shown as an example of best-in-class craftsmanship. Content is rich and specific throughout. Structure is intentional at every level. The visual design, content hierarchy, navigation, and accessibility considerations are all clearly considered. An L4 item raises the bar for every other item in the gallery and serves as an aspiration point.

**Example**: a UX researcher's portfolio with a hero (role + clear value proposition + social proof or credibility signal), four or more case studies told as structured narratives with research methods, insights, design decisions, and impact, an about section with personal narrative and professional timeline, a contact section, a blog or writing section, and a speaking page. Every case study contains original visuals (not generic stock), the voice is distinctive, and the whole portfolio tells a coherent professional story. Accessibility markers are visible (alt text completeness, heading structure, link text clarity).

**Required sections**: hero, at least four other sections, with all project case studies containing structured narratives (problem, approach, outcome, and reflection). About section must be comprehensive (personal story, professional background, and current focus). Visual consistency must be observable across all sections (not a one-off landing page with a strong hero and neglected inner pages).

### Quality scoring rule

When a reviewer scores an item, they assign the highest level whose criteria are fully met. If an item satisfies the section count for L3 but the content inside those sections is thin (L2 depth), the score is L2. Section count is a necessary condition, not a sufficient one. Content depth across all present sections determines the final level.

---

## 2. Mandatory Compliance Gate

The compliance gate is a separate dimension from quality. It evaluates whether the item meets FolioMuse's binding rules around consent, attribution, and originality, as defined by the charter (`docs/product/charter.md`) and the originality rules (`docs/product/originality-rules.md`). Compliance is scored independently: an item cannot trade off compliance for quality or vice versa.

### Compliance statuses

- **PASS**: the item satisfies all mandatory compliance checks. No blocking issues.
- **FLAG**: the item has a non-blocking concern that should be recorded and revisited. The item can still be accepted if quality meets the threshold, but the flag must be documented in the review decision rationale. Example: attribution is complete but the consent record uses a generic organizational email rather than an individual creator's contact. The review decision must note the flag and any follow-up action.
- **FAIL**: the item violates a mandatory compliance rule. The item **cannot be accepted regardless of quality score**. A compliance FAIL is a hard block. Even an L4 item with compliance FAIL must be rejected with reason `COMPLIANCE_FAIL`.

### Mandatory compliance checks

Every item under review must pass these checks before acceptance can be considered:

1. **Attribution completeness (R3)**: `creatorName`, `sourceUrl`, `licenseType`, and `consentDate` must all be present and non-empty. A missing `creatorName` or a blank `sourceUrl` is an automatic FAIL. Attribution must travel with the item through any pipeline and must never be stripped. If attribution would be lost or unverifiable in the current display context, that is a FAIL.

2. **Consent validity (R4, NG3)**: a `ConsentRecord` must exist with `tier >= DISPLAY`. The `consentedBy` field must identify a real entity (individual or organization) that can be traced to the item's creator or rightsholder. `consentedAt` must be a valid timestamp. If consent was given under terms that do not cover gallery display (tier below `DISPLAY`), the item fails this check. Items ingested without any consent record — for example, scraped without permission — automatically fail (NG3).

3. **No cross-creator cloning (NG4, R5)**: the item must not be a structural copy of another creator's item with the attribution changed. This is distinct from the duplicate check (section 8) and the originality-score check (R8, deferred). The compliance check here is a human-facing rule: if a reviewer can identify that the item's structure and content pattern are substantially identical to an existing item from a different creator, the item must be flagged as `CROSS_CLONE` and rejected.

4. **No fabricated credibility signals (content-quality §6)**: the item must not present AI-generated or synthesized content as verified real-world claims. Examples: a portfolio claiming "worked with Fortune 500 companies" when no such engagement can be verified through the attribution chain; a case study presenting fabricated metrics or client names; a testimonial with no traceable source. Fabricated credibility is a compliance FAIL, not just a quality demotion.

5. **Attribution integrity under processing (R3, ADR-0001)**: if the item has been processed through a retrieval or embedding pipeline, the attribution metadata must remain intact and retrievable. Any processing step that strips or severs the link between content and attribution is a FAIL. This check applies after ingestion, not just at review time — a periodic audit against processed items is expected.

### Gate precedence

The compliance gate is evaluated before quality scoring. The reviewer workflow (section 6) requires checking compliance first. If compliance is FAIL, the review stops: the item is rejected with reason `COMPLIANCE_FAIL` and no quality score is assigned. If compliance is PASS or FLAG, the reviewer proceeds to quality scoring. A FLAG does not block acceptance but must be recorded.

---

## 3. Acceptance Criteria

An item is accepted into the gallery corpus only when **all** of the following conditions are met simultaneously:

1. **Quality ≥ L2**: the item meets or exceeds the Adequate level defined in section 1.
2. **Compliance = PASS**: the item passed all mandatory compliance checks with no blocking issues.
3. **Consent exists with tier ≥ DISPLAY**: a `ConsentRecord` is attached and the tier grants at least display rights.
4. **Attribution is complete**: `creatorName`, `sourceUrl`, `licenseType`, and `consentDate` are all present, non-empty, and match the consent record.
5. **No duplicate detected**: the item is not an exact duplicate of an existing gallery item (section 8), and no cross-creator clone has been confirmed.
6. **Coverage gap assessed**: the reviewer has determined whether the item fills or overlaps with existing role and style coverage (section 5), and that assessment has been recorded. This condition is informational — it does not block acceptance — but it must not be skipped.

If any of conditions 1 through 5 is not met, the item must be rejected with the corresponding rejection reason (section 4). Condition 6 is always assessed but never blocks acceptance on its own.

---

## 4. Rejection Reasons

Every rejected item must carry exactly one primary rejection reason from the enumerated set below. Additional context goes in the review `rationale` field, not in the reason code. If multiple reasons apply, the reviewer selects the one highest in the list that definitively applies, and notes the others in the rationale.

| Code | Meaning | When to use |
|---|---|---|
| `QUALITY_BELOW_THRESHOLD` | The item scored L0 or L1. Content is too thin, incomplete, or poorly structured to serve as a pattern reference. | Quality score < L2. |
| `COMPLIANCE_FAIL` | One or more mandatory compliance checks failed. | Attribution missing or unverifiable, consent invalid or absent, fabricated credibility confirmed, cross-creator clone detected, or attribution stripped during processing. |
| `MISSING_CONSENT` | No `ConsentRecord` exists, or the consent tier is below `DISPLAY`. | Item was ingested without documented consent (NG3 violation), or consent was revoked and no valid consent remains. |
| `INCOMPLETE_ATTRIBUTION` | One or more required attribution fields (`creatorName`, `sourceUrl`, `licenseType`, `consentDate`) is missing, empty, or unverifiable. | Different from `COMPLIANCE_FAIL` only when consent and all other compliance checks pass but attribution alone is incomplete. If attribution is missing AND consent is absent, use `MISSING_CONSENT` (higher priority). |
| `DUPLICATE` | The item is an exact duplicate of an existing gallery item (same `sourceUrl`). | The same URL was already submitted and the existing item is accepted or pending. |
| `CROSS_CLONE` | The item was confirmed by a senior reviewer to be a structural copy of another creator's accepted item, with the creator attribution changed. | Confirmed cross-creator duplication. Requires senior reviewer confirmation (section 8). |
| `FABRICATED_CREDIBILITY` | The item contains verifiably false claims presented as real (content-quality §6). | Falsified metrics, client names, testimonials, or professional claims that cannot be traced through the attribution chain. |
| `STALE_CONTENT` | The item was archived due to exceeding the 18-month stale threshold (section 9) and was subsequently resubmitted without material updates. | The item was previously archived as stale and the resubmission contains no meaningful changes. This code is also used when a reviewer explicitly rejects an item for staleness during an audit cycle, though the primary stale-content action is archival (not rejection). |

Rejection reasons are stored in the `ReviewDecision` record and logged in the `AuditEntry`. A rejected item may be resubmitted after the reason is addressed (though exact duplicates remain blocked).

---

## 5. Role and Style Coverage Goals

The gallery corpus must represent a diverse range of professional roles and design styles. A homogeneous corpus risks over-indexing on one profession's conventions and presenting them as universal patterns. This section defines target distributions and review cadence for coverage gaps.

### Role coverage targets

The gallery should maintain representation across these role tiers, with minimums defined per tier at every corpus-size threshold:

| Role tier | Examples | Minimum at 30 items | Minimum at 100 items | Minimum at 300 items |
|---|---|---|---|---|
| Visual design | Graphic designer, UI/UX designer, brand designer, illustrator, motion designer | 5 | 15 | 40 |
| Development | Frontend developer, full-stack engineer, mobile developer, game developer | 5 | 15 | 40 |
| Writing and content | Copywriter, technical writer, content strategist, journalist | 3 | 8 | 25 |
| Photography and visual art | Photographer, videographer, 3D artist, animator | 3 | 8 | 25 |
| Product and management | Product manager, project manager, producer, creative director | 2 | 6 | 20 |
| Other creative | Architect, musician, researcher, data scientist, educator | 2 | 5 | 15 |

These are targets, not hard acceptance gates. An item is never rejected solely because its role tier is overrepresented. But when the corpus is below target for a tier, the reviewer should note the gap and, when multiple items are pending, prioritize items that fill underrepresented tiers.

### Style coverage targets

Design style should also be tracked to ensure the gallery does not converge on one aesthetic. Styles are tagged per item as an array of descriptors:

| Style category | Examples | Desired distribution |
|---|---|---|
| Minimal / clean | White-space-rich layouts, restrained typography, neutral palette | 20–30% |
| Editorial / typographic | Strong typographic hierarchy, magazine-inspired layouts | 15–25% |
| Illustrated / expressive | Heavy use of custom illustrations, bold color, playful tone | 10–20% |
| Data-viz / technical | Charts, metrics-heavy, code-display, dense information | 10–20% |
| Dark / dramatic | Dark backgrounds, high contrast, atmospheric | 5–15% |
| Interactive / animated | Motion-forward, parallax, scroll-driven narrative | 5–15% |
| Mixed / experimental | Layouts that defy standard section conventions | 5–10% |

### Review cadence for coverage gaps

- At every 30-item milestone, a coverage audit is run: count items per role tier and style category, compare against targets.
- Gaps are documented in the decision log.
- If a role tier has zero items at any corpus size above 30, the reviewer team should actively seek submissions in that tier.
- Style coverage is advisory: the corpus should not be gated on style distribution. But persistent gaps (a category at zero for two consecutive audits) should prompt an escalation for a sourced-ingestion effort.

Coverage assessment is condition 6 of the acceptance criteria (section 3). It is recorded per review but does not block acceptance.

---

## 6. Reviewer Workflow

Every gallery item follows this step-by-step review process. Each step must be completed before the next begins. Deviations must be documented.

### Step 1: Item enters PENDING_REVIEW

An item is submitted for review. The item's `status` is set to `PENDING_REVIEW`. A timestamp is recorded. The item is added to the reviewer queue. At this stage, only the item's metadata and structure are visible; no quality or compliance assessment has occurred.

### Step 2: Reviewer assigned

A reviewer is assigned to the item. Assignment is round-robin across the active reviewer team unless the item is a resubmission, in which case it is assigned to the original reviewer if available (section 12). No reviewer may review their own submitted items.

### Step 3: Compliance gate checked first

The reviewer evaluates the mandatory compliance checks (section 2) before any quality assessment. The order of evaluation:

1. Attribution completeness.
2. Consent validity (at least `DISPLAY` tier).
3. Cross-creator clone check.
4. Fabricated credibility check.
5. Attribution integrity under processing.

If any check returns FAIL, the review stops. The item is rejected with `COMPLIANCE_FAIL` (or `MISSING_CONSENT`, `INCOMPLETE_ATTRIBUTION`, `CROSS_CLONE`, or `FABRICATED_CREDIBILITY` as appropriate, per section 4). No quality score is assigned. A rejection audit entry is created with the reason and rationale.

If all checks pass (or the only non-pass is a FLAG), the reviewer proceeds to step 4.

### Step 4: Quality scored L0–L4

The reviewer scores the item using the L0–L4 definitions in section 1. The reviewer evaluates section presence, content depth, structural clarity, and overall polish. The score is the highest level whose criteria are fully met. Section count alone is not sufficient: content depth across present sections determines the level.

### Step 5: Decision and documentation

- If compliance is PASS and quality ≥ L2: the item is **accepted**. Status is set to `ACCEPTED`. A `ReviewDecision` record is created with `decision = ACCEPT`, the quality level, the compliance status, and a non-empty `rationale` field explaining the score.
- If compliance is FLAG and quality ≥ L2: the item may still be **accepted**, but the flag must be explicitly documented in the rationale. The item's compliance status remains FLAG on the record. The reviewer notes the flag nature and any expected resolution.
- If compliance is FAIL or quality < L2: the item is **rejected**. Status is set to `REJECTED`. A `ReviewDecision` record is created with `decision = REJECT`, the quality level (if scored), the rejection reason, and a non-empty rationale.

### Step 6: Audit entry created

Every decision generates an append-only `AuditEntry` (section 11) with:
- `action`: `ACCEPT` or `REJECT`.
- `actorId`: the reviewer's identifier.
- `itemId`: the item being reviewed.
- `decision`: the `ReviewDecision` content.
- `rationale`: a written justification for the decision.
- `timestamp`: when the decision was made.

### Acceptance flow summary

```
PENDING_REVIEW → compliance check (PASS/FLAG) → quality score (L0–L4) → ACCEPTED (if PASS + ≥ L2) or REJECTED (otherwise)
PENDING_REVIEW → compliance check (FAIL) → REJECTED (no quality score)
```

---

## 7. Escalation

### Reviewer conflict

If two reviewers assign quality scores that differ by more than one level (for example, Reviewer A scores L4, Reviewer B scores L2), the conflict is escalated to a senior reviewer automatically. The senior reviewer performs an independent review: they re-evaluate both compliance and quality, produce their own score and decision, and their decision is binding.

The senior reviewer's decision is recorded as an `OVERRIDE` audit entry, distinct from a standard `ACCEPT` or `REJECT` entry. The original reviewers' scores and rationales are preserved in the audit log but are superseded by the override.

If the senior reviewer's compliance assessment differs from the original reviewers' (PASS vs FAIL, or FLAG interpretation disagreement), the same escalation rule applies: the senior reviewer's compliance assessment is binding.

### Emergency takedown

Any reviewer may immediately set an item's status to `SUSPENDED` if they identify a serious issue that cannot wait for normal review. Triggers include:

- Discovery that consent was fraudulently obtained.
- Discovery that the item is a confirmed cross-creator clone that was previously missed.
- A legal takedown request from the item's creator or rightsholder.
- Content that, upon re-examination, violates the charter's non-goals (NG1, NG3, NG4).

Suspension is an emergency action, not a final decision. Within 48 hours of suspension, a full review must be conducted by a senior reviewer. The senior reviewer may:
- Confirm the suspension and change status to `REJECTED` (if the issue is confirmed).
- Lift the suspension and restore the item to its previous status (if the issue was a false alarm).
- Escalate further if the issue requires charter amendment or ADR.

### OVERRIDE audit entries

All escalated decisions generate `AuditEntry` records with `action = OVERRIDE`. The entry must reference the original `ReviewDecision` IDs that were overridden and must contain a rationale explaining why the override was necessary. Overrides are not deletions of history: the original reviews remain in the audit log and the override is an additional entry.

---

## 8. Duplicate Handling

Duplicate detection is manual in v1 (no automated duplicate detection, no embedding-based similarity search). Reviewers flag duplicates during the compliance check (section 6, step 3). Three cases are defined.

### Case 1: Exact duplicate

**Definition**: the item has the same `sourceUrl` as an existing gallery item (accepted or pending). Same webpage, same creator, same content.

**Action**: reject the new item with reason `DUPLICATE`. The existing item is not modified. The rejection rationale must include the ID of the existing duplicate.

### Case 2: Structural duplicate (same creator, different URL, same project)

**Definition**: the item comes from the same creator and represents the same portfolio project but was submitted from a different URL (for example, the creator's personal site vs. their Behance or Dribbble mirror). The structure and content are recognizably the same body of work.

**Action**: accept the new item as a **variant**. It gets its own `GalleryItem` record with `duplicateOfId` pointing to the ID of the first-accepted version of that project. Both items remain in the gallery. Variants are useful for understanding how the same project is presented on different platforms, which is a legitimate pattern reference. During acceptance, the reviewer assigns the quality score based on this specific variant's presentation, not the original's. A variant can be a different quality level than the original.

### Case 3: Cross-creator duplicate

**Definition**: the item appears structurally identical or near-identical to an existing item from a **different** creator, with the creator attribution changed. This suggests one creator copied another's portfolio structure wholesale.

**Action**: flag for senior reviewer review. The item status remains `PENDING_REVIEW` and the duplicated item ID is noted in the compliance check. The senior reviewer investigates and decides:
- If confirmed as a cross-creator clone: reject with `CROSS_CLONE`. Both items remain in the system (the original stays accepted; the clone is rejected). A `DUPLICATE_FLAG` audit entry records the cross-reference.
- If determined to be coincidental similarity or a shared template: the item may proceed through normal review. The senior reviewer's determination is documented in the rationale.
- If ambiguous: the senior reviewer may request additional information from the submitter before deciding. During investigation, the item remains `PENDING_REVIEW`.

The `CROSS_CLONE` rejection reason can only be assigned by a senior reviewer after investigation. Regular reviewers flag the concern; they do not assign this rejection code.

---

## 9. Stale-Content Policy

Gallery items can become stale over time. A portfolio from 2020 may no longer represent current design patterns or professional conventions. Staleness is a curatorial concern, not a quality judgment: the item may have been exemplary when accepted but is no longer a reliable pattern reference.

### Staleness threshold

An item is considered stale when **18 months** have passed since its last review (acceptance or most recent re-review), and no reviewer has re-validated it in the interim. The threshold is measured from `reviewedAt` on the most recent `ReviewDecision` with `decision = ACCEPT`, or from the `acceptedAt` timestamp if no re-review has occurred.

### Archival process

When the 18-month threshold is reached:
1. The item's status is set to `ARCHIVED`.
2. A `staleSince` timestamp is recorded.
3. An `AuditEntry` is created with `action = ARCHIVE`, noting that the trigger was the 18-month staleness threshold.
4. Any `PatternSignal` records derived from this item are marked stale via their `staleSince` field. Pattern signals remain in the system but are excluded from future synthesis until re-derived from non-stale sources.

### Manual takedown as secondary trigger

A creator may request their item be archived at any time, regardless of the 18-month threshold. This is a secondary trigger, handled the same way: status → `ARCHIVED`, audit entry → `ARCHIVE`, pattern signals → marked stale. The rationale in the audit entry notes that the archival was creator-requested.

### Archived items are never deleted

Archived items remain in the database and in the audit log permanently. They are excluded from active gallery queries, pattern signal derivation, and coverage audits. But their attribution, consent records, and review history are preserved. No deletion path exists for gallery items; ARCHIVED is the terminal state for items removed from active circulation.

### Resubmission after archival

An archived item may be resubmitted by a reviewer or by the creator if the content has been materially updated. The resubmission follows the normal review workflow. If the reviewer determines the content has not materially changed since archival, the item is rejected with reason `STALE_CONTENT` (section 4). If the content is substantially updated, the item undergoes full re-review (section 12) and may be re-accepted.

---

## 10. Consent Revocation

A creator or rightsholder may revoke consent for their portfolio content to appear in the gallery at any time. Consent revocation is a binding action under NG3 and R4: the gallery must not continue to display content when consent has been withdrawn.

### Revocation process

When consent is revoked:
1. **The item is archived immediately**. Status is set to `ARCHIVED`. The revocation is treated as the archival trigger.
2. **Pattern signals are marked stale**. Any `PatternSignal` derived from the revoked item gets its `staleSince` field set to the revocation timestamp. Pattern signals are excluded from future synthesis until they are re-derived from non-stale, non-revoked sources.
3. **The consent record is preserved**. The `ConsentRecord` is not deleted. Instead, a revocation timestamp (`revokedAt`) is appended, and the record remains in the database for audit traceability.
4. **An audit entry is created**. `action = CONSENT_REVOKE`, with the revocation rationale and the consent record reference.
5. **No auto-renewal**. Consent, once revoked, does not auto-renew. A new, explicit consent record must be created if the creator later decides to re-consent. The original consent record remains as a historical artifact.

### What revocation means for existing references

- If section intelligence previously used pattern signals derived from the revoked item, those existing suggestions are not retroactively removed, but future suggestions must use the `staleSince` marker to exclude stale signals.
- If the MCP agent previously referenced patterns from a now-revoked item, the agent must treat those references as deprecated on the next session. This is an agent-level behavior, not enforced by this rubric, but the rubric's data model supports it through the `staleSince` field.
- The item's raw content is never served by the gallery after archival. Archived items are excluded from all read paths.

### Takedown by platform or legal request

If a platform (e.g., an organization hosting the creator's portfolio) or a legal representative requests removal on behalf of the creator, the same revocation process applies. The `consentedBy` field on the original `ConsentRecord` must match or be traceable to the requesting party. If it is not, the request is escalated to a senior reviewer (section 7) before action is taken.

---

## 11. Audit History

Every action that changes the state of a gallery item, its consent, its attribution, or its review status must produce an append-only `AuditEntry`. The audit log is the canonical record of everything that happened to an item from ingestion through archival.

### Audit actions

The following actions generate audit entries:

| Action | When triggered |
|---|---|
| `INGEST` | A new item is submitted for review. |
| `REVIEW` | A reviewer begins evaluating an item (step 3 of workflow). |
| `ACCEPT` | An item passes review and is accepted. |
| `REJECT` | An item fails review and is rejected. |
| `ESCALATE` | A reviewer conflict is escalated to a senior reviewer. |
| `OVERRIDE` | A senior reviewer overrides a previous review decision. |
| `ARCHIVE` | An item is archived (stale threshold, consent revocation, or manual takedown). |
| `SUSPEND` | An item is emergency-suspended. |
| `CONSENT_REVOKE` | A creator or rightsholder revokes consent. |
| `DUPLICATE_FLAG` | A duplicate or cross-creator clone is flagged. |
| `RE_REVIEW` | An item enters re-review after a creator update. |

### Audit entry structure

Every `AuditEntry` contains:

| Field | Description |
|---|---|
| `id` | Unique identifier. |
| `action` | One of the audit actions listed above. |
| `actorId` | Who performed the action (reviewer ID, system, or creator ID for consent actions). |
| `itemId` | The gallery item this entry pertains to. |
| `decision` | Nullable. The `ReviewDecision` content, if this entry records a review outcome. Null for ingest, archive, suspend, and administrative actions. |
| `rationale` | Non-empty string. A human-readable justification for the action. Mandatory for all entries: even non-review actions (ingest, archive) must carry a rationale explaining why the action was taken. |
| `timestamp` | ISO 8601 datetime of when the action occurred. |

### Immutability rules

- Audit entries are **append-only**. The domain interface exposes a `createAuditEntry()` method. There is no `updateAuditEntry()` or `deleteAuditEntry()` method. This is enforced at the domain interface contract level, not just by convention.
- Once an audit entry is written, it cannot be modified or removed. Any correction to an audit entry requires a new entry that references the original entry by ID and explains the correction.
- The repository implementation must enforce append-only behavior at the persistence layer: the database schema should use `INSERT` permissions only for the audit table, with no `UPDATE` or `DELETE` grants (permission configuration is a deployment concern, not enforced in the schema DDL, but the domain interface must not expose mutating methods).

### Audit trail for a single item

A typical item's audit trail flows:

```
INGEST (item submitted) → REVIEW (reviewer begins) → ACCEPT (accepted with L3/PASS) → ... (18 months pass) → ARCHIVE (stale threshold)
```

With re-review:

```
INGEST → REVIEW → ACCEPT → RE_REVIEW (creator update) → REVIEW → ACCEPT (updated, L4/PASS)
```

With escalation:

```
INGEST → REVIEW → ACCEPT (Reviewer A: L4) → REVIEW (Reviewer B: L2) → ESCALATE → OVERRIDE (Senior: L3)
```

The full audit history for any item must be queryable by `itemId` and return all entries in chronological order.

---

## 12. Re-Review

A gallery item may be re-reviewed when the creator submits a substantial update to the content. Re-review ensures that the item's quality score and compliance status remain current and that pattern signals derived from the item are trustworthy.

### Trigger

Re-review is triggered when:
- A creator submits an updated version of their portfolio content through the ingestion path.
- The submission is linked to an existing gallery item (the creator identifies that this is an update, not a new submission).
- The item's current status is `ACCEPTED` or `ARCHIVED` (an archived item may be re-reviewed if the content has materially changed).

When triggered, the item's status is set to `PENDING_REREVIEW`. An audit entry with `action = RE_REVIEW` is created, noting that the trigger was a creator-initiated update.

### Assignee

The item is assigned to the original reviewer if that reviewer is still active on the team. If the original reviewer is unavailable, assignment follows the standard round-robin process. The original reviewer's familiarity with the item reduces re-review overhead and improves consistency.

### Review scope

Re-review follows the same workflow as initial review (section 6). The reviewer:
1. Checks compliance first (attribution and consent may have changed).
2. Scores quality against the L0–L4 rubric.
3. Decides accept or reject.

The reviewer should focus on **what changed** relative to the previously accepted version. The delta between the old and new content should be the primary evidence for the quality score. If the delta is trivially small (for example, a single typo fix), the reviewer may fast-track the re-review and carry forward the previous score without a full re-evaluation, but they must document this decision in the rationale.

If the reviewer determines the update significantly degraded the item (for example, the creator removed several case studies and the item now meets L1 criteria), the item may be rejected on re-review despite having been previously accepted. A previously accepted item can regress in quality.

### Outcome

- If accepted on re-review: status returns to `ACCEPTED`. The `reviewedAt` timestamp is updated (resetting the 18-month stale clock). A `ReviewDecision` record is created with the new quality score. The previous acceptance decision remains in the audit log as historical context.
- If rejected on re-review: status is set to `REJECTED`. The rejection reason and rationale are recorded. The previous acceptance is not retroactively invalidated; the item was correctly accepted at the time, and the rejection reflects the current version's deficiencies.

---

## 13. Charter Compliance Note

This rubric must be checked against `docs/product/charter.md` and `docs/product/originality-rules.md` before finalization and after any amendment. No rubric criterion may incentivize cloning, consent bypass, or verbatim content reuse. The following cross-references document how each rubric provision satisfies or respects the binding rules.

### Charter non-goals (charter.md §7)

| Non-goal | How this rubric enforces it |
|---|---|
| **NG1** (no bulk/verbatim copy of another portfolio) | The duplicate handling rules (section 8) block exact duplicates. The cross-creator clone check (section 2, check 3) flags structural copies where the creator attribution was changed. The compliance gate blocks any item that is a confirmed cross-creator clone. The quality scoring rules (section 1) do not reward structural mimicry: an L3 or L4 requires original, specific content, not a hollow copy of someone else's structure. |
| **NG3** (no ingestion without consent/licensing) | The consent validity check (section 2, check 2) requires a `ConsentRecord` with tier ≥ `DISPLAY` before any item can be accepted. Items submitted without consent are rejected with `MISSING_CONSENT`. Consent revocation (section 10) archives items immediately. The consent model records who consented, when, and under what terms (R4). |
| **NG4** (AI suggestions must be synthesized, not sourced from one item) | The rubric defines quality as a structural and content assessment of the source item itself. It does not define or constrain what section intelligence does with patterns. However, the rubric's data model supports NG4 indirectly: `PatternSignal` records are separate from `GalleryItem` records (ADR-0001), and pattern signals derived from archived or stale items are excluded from future synthesis (section 9). The rubric does not define the synthesis algorithm, but it ensures that the data feeding into synthesis carries attribution provenance and that stale/revoked items are excluded. |

### Originality rules (originality-rules.md R1–R8)

| Rule | How this rubric enforces it |
|---|---|
| **R1** (no verbatim structural cloning) | The duplicate handling rules (section 8) and cross-creator clone compliance check (section 2, check 3) enforce this at the ingestion boundary. An item that is a near-identical copy of another creator's portfolio cannot pass the compliance gate. The quality scoring rules require original, specific content at L2 and above, which structurally incentivizes against submitting cloned work. |
| **R2** (synthesis from N ≥ 3, not single source) | This rubric does not directly implement R2 (R2 governs section intelligence behavior, not gallery curation). However, the rubric's pattern-signal staleness rules (sections 9 and 10) ensure that signals derived from stale or revoked items are excluded from synthesis, reducing the risk of R2 violations from bad source data. |
| **R3** (attribution must travel with content) | The attribution completeness compliance check (section 2, check 1) requires all four attribution fields to be present and non-empty. The attribution integrity check (section 2, check 5) explicitly prohibits any processing step that strips attribution. The acceptance criteria (section 3) require attribution to be complete at acceptance time. Attribution is stored as a non-nullable foreign key in the schema (ADR-0002), enforced at the persistence layer. |
| **R4** (consent-gated ingestion) | The consent validity check (section 2, check 2), the acceptance criteria requiring `tier ≥ DISPLAY` (section 3, condition 3), the consent revocation policy (section 10), and the audit trail for consent actions (section 11) collectively enforce R4. Every item in the gallery has a documented, auditable consent record. |
| **R5** (agent writes only user-authored or synthesized content) | This rubric governs gallery curation, not MCP agent behavior. R5 is enforced by the MCP agent's domain logic and by the charter. The rubric supports R5 indirectly by ensuring that gallery content (which the agent could potentially access) carries attribution and consent provenance, so that if the agent ever attempted to copy gallery content, the provenance chain would make the violation traceable. |
| **R6** (disclosure of AI/agent authorship) | Not enforced by this rubric. This rubric governs gallery content, which is human-authored by definition (the gallery is a collection of real, attributed portfolios). AI-authored content does not enter the gallery as a source item. R6 is a section-intelligence and MCP agent concern. |
| **R7** (right to inspect and reject suggestions) | Not enforced by this rubric. R7 applies to section-intelligence suggestions shown to users, not to gallery curation decisions. |
| **R8** (similarity monitoring at publish time) | The rubric's schema reserves `structureFingerprint` and `contentHash` fields on `GalleryItem` for future originality-score computation. The originality-score algorithm, threshold, and enforcement level (warn vs. block) are explicitly deferred per R8's open questions. This rubric does not define the algorithm, but it ensures the data model is ready for it. |

### Content-quality principles (content-quality-principles.md)

| Principle | How this rubric enforces or references it |
|---|---|
| §1 (specific over generic) | The L0–L4 quality definitions (section 1) reward specific, substantive content. L2 requires "real content, not placeholder." L3 and L4 require depth and detail in every section. An item that is generic filler cannot score above L1. |
| §2 (pattern-grounded, not source-copied) | Not directly enforced by the curation rubric (this is a section-intelligence concern). The rubric's duplicate handling (section 8) and compliance gate (section 2, check 3) prevent copied items from entering the gallery, which indirectly prevents section intelligence from using copied items as pattern sources. |
| §3 (attribution is first-class) | Section 2, check 1, and section 3, condition 4, enforce this at the curation boundary. Attribution completeness is a hard acceptance criterion, not optional metadata. |
| §4 (actionable, scoped feedback) | Not enforced by this rubric. Applies to section-intelligence output, not curation. |
| §5 (agent-authored content is provisional) | Not enforced by this rubric. Applies to MCP agent behavior. |
| §6 (no fabricated credibility signals) | The compliance gate (section 2, check 4) explicitly flags and rejects items with fabricated credibility claims. The `FABRICATED_CREDIBILITY` rejection reason (section 4) covers this. L4 items are expected to have verifiable, traceable credibility signals (testimonials with sources, verifiable client names, real metrics). |
| §7 (consistency of voice) | The L3 and L4 quality definitions require a consistent voice across sections as a marker of quality. An item where the hero is casual and the about section is formal without intentional contrast is a quality demotion, not a compliance failure. |
| §8 (accessibility as quality dimension) | The L4 quality definition explicitly includes accessibility markers (alt text completeness, heading structure, link text clarity). L3 also expects visual hierarchy and clear navigation. Accessibility is not a compliance gate in v1, but it is a differentiator between L3 and L4. |

### Cross-references

- **`docs/product/charter.md`**: §7 non-goals NG1/NG3/NG4; §9 content-quality principles reference; §10 originality rules reference.
- **`docs/product/originality-rules.md`**: R1–R8, binding on any feature touching the gallery; R8 deferred questions.
- **`docs/product/content-quality-principles.md`**: 8 principles, esp. §6 fabricated credibility and §8 accessibility.
- **`docs/product/success-metrics.md`**: guardrail metrics (originality score, attribution integrity, agent-authored-content disclosure rate, accessibility compliance rate).
- **`docs/adr/0001-product-charter-and-anti-cloning-boundary.md`**: source-item vs. pattern-signal separation, no exportable content blob, attribution non-strippable.
- **`docs/adr/0002-gallery-schema-design.md`**: schema decisions for `GalleryItem`, `ConsentRecord`, `Attribution`, `AuditEntry`, `PatternSignal`, `ReviewDecision`.

### Amendment note

Any change to this rubric requires a new entry in `docs/product/decision-log.md` explaining the change and rationale (per charter §12). If a rubric change alters the schema (for example, adding a new rejection reason that requires a database field), an ADR must be created or amended.
