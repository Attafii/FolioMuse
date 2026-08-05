# FolioMuse — Reviewer Runbook (v1)

Parent document: `docs/product/curation-rubric.md`
Status: Draft v1
Audience: Human internal reviewers only. No automated agents execute this document.

> This runbook is the step-by-step operational guide for reviewers who evaluate gallery items submitted to FolioMuse's human gallery corpus. It translates the curation rubric (`docs/product/curation-rubric.md`) into an executable workflow. Read the rubric first: every quality level, compliance check, rejection reason, and policy rule in this runbook is defined there. If this runbook and the rubric conflict, the rubric takes precedence and this document must be amended.

---

## 1. Prerequisites

Before reviewing any item, you must have read and understood these documents:

- **`docs/product/curation-rubric.md`**: the binding editorial standard. Know the L0-L4 quality definitions (section 1), the mandatory compliance checks (section 2), the acceptance criteria (section 3), the 8 rejection reasons (section 4), and all policies (sections 7-12).
- **`docs/product/originality-rules.md`** R1-R8: the anti-cloning rules. Pay special attention to:
  - R1 (no verbatim structural cloning)
  - R3 (attribution must travel with content)
  - R4 (consent-gated ingestion)
- **This runbook itself**: the operational workflow you follow for every review.

You do not need to memorise the rubric, but you must consult it when in doubt. If you have not read the rubric in the last 30 days, re-read at least sections 1-4 and 7-9 before starting any review session.

---

## 2. Ingestion Step

A new gallery item enters the review queue with status `PENDING_REVIEW`. Before you begin a full review, perform these three fast checks. If any fail, reject immediately without proceeding to the compliance gate or quality scoring.

### 2.1 Consent validity check

- Open the item's attached `ConsentRecord`.
- Confirm `tier` is at least `DISPLAY`. If `tier` is below `DISPLAY` or no `ConsentRecord` exists, reject with reason `MISSING_CONSENT`.
- Confirm `consentedAt` is a valid timestamp and `consentedBy` identifies a real entity traceable to the item's creator or rightsholder. If either is missing or clearly bogus ("test", "n/a", a throwaway email with no verifiable connection), reject with `MISSING_CONSENT`.

### 2.2 Attribution completeness check

- Confirm all four required fields are present and non-empty: `creatorName`, `sourceUrl`, `licenseType`, `consentDate`.
- If any field is missing, empty, or a placeholder ("TBD", "unknown", "N/A"), reject with `INCOMPLETE_ATTRIBUTION`.
- If the `sourceUrl` does not resolve to a live page (404, domain expired, private page with no access), treat this as incomplete attribution. The source must be verifiable.

### 2.3 Duplicate sourceUrl check

- Check whether the item's `sourceUrl` already exists on any `GalleryItem` in the system (regardless of that item's current status).
- If a match is found, this is an exact duplicate. Reject with reason `DUPLICATE`. The rejection rationale must include the ID of the existing item.

If all three checks pass, proceed to section 3.

---

## 3. Compliance Gate (Do This First)

The compliance gate is evaluated **before** quality scoring. If compliance fails, the review stops: no quality score is assigned and the item is rejected regardless of how good it looks.

### 3.1 Evaluate each check in order

Work through these five checks sequentially. Stop at the first FAIL and reject.

**Check 1: Attribution complete.** Re-verify all four attribution fields are present, non-empty, and match the consent record. Reason for any failure: `INCOMPLETE_ATTRIBUTION`.

**Check 2: Consent valid.** Re-verify `tier >= DISPLAY`, `consentedBy` is a real entity, `consentedAt` is a valid timestamp. Reason for any failure: `MISSING_CONSENT`.

**Check 3: No cross-creator clone.** Compare the item against existing accepted items from **different** creators. Is the structure and content pattern substantially identical, with only the creator attribution changed? If yes, this is a cross-creator clone. Record a `DUPLICATE_FLAG` audit entry referencing the existing item's ID, and reject with `CROSS_CLONE`. This rejection reason may only be assigned after confirmation by a senior reviewer (see section 8). If you suspect but cannot confirm, flag the item and escalate.

**Check 4: No fabricated credibility signals** (content-quality-principles §6). Scan for claims that appear to be verifiably false: "worked with Fortune 500 companies" with no traceable evidence, fabricated metrics, non-existent client names, testimonials from unverifiable sources. If you find credible evidence of fabrication, reject with `FABRICATED_CREDIBILITY`. Suspicion alone is not enough: you must be able to point to a specific claim that is demonstrably false. If you suspect but cannot prove fabrication, record a FLAG and proceed.

**Check 5: Attribution integrity under processing** (R3, ADR-0001). If the item has passed through any processing pipeline (embedding, retrieval indexing, structure extraction), confirm the attribution metadata remains intact and retrievable. If processing has stripped or severed the link between content and attribution, this is a FAIL. Reject with `COMPLIANCE_FAIL`.

### 3.2 Record the compliance outcome

- All five checks pass: `ComplianceStatus = PASS`. Proceed to quality scoring (section 4).
- One or more checks produce FLAG but none FAIL: `ComplianceStatus = FLAG`. Record the flag details in the rationale. Proceed to quality scoring. The FLAG does not block acceptance but must be documented.
- Any check FAILs: `ComplianceStatus = FAIL`. Reject with the appropriate rejection reason (see section 6). Do not proceed to quality scoring.

---

## 4. Quality Scoring (L0-L4)

Only proceed here if compliance is PASS or FLAG. Score the item using the L0-L4 definitions from `docs/product/curation-rubric.md` section 1. Evaluate these dimensions:

### 4.1 Section completeness

Count the identifiable sections. Does the item have a hero? At least two other sections for L2? At least three others for L3? At least four others for L4? Refer to the rubric's required-section counts per level.

### 4.2 Structural clarity

Are sections clearly delineated? Is there a visual hierarchy (headings, spacing, logical order)? Can a user navigate the portfolio and understand what each section contains?

### 4.3 Content specificity

Is the content real and specific, not generic filler? At L2: at least one project entry has a substantive description. At L3: every project entry has detailed context. At L4: every case study has a structured narrative (problem, approach, outcome, reflection).

### 4.4 Accessibility (content-quality-principles §8)

Check for accessibility markers: alt text on images, proper heading structure (no skipped levels), link text that is descriptive (not "click here" or raw URLs). Accessibility is a differentiator between L3 and L4. A portfolio without alt text or with broken heading hierarchy cannot score L4.

### 4.5 Voice authenticity

Is the voice consistent and distinctive? At L3 and L4, the portfolio should read like a real person wrote it. If sections switch between formal and casual without intentional contrast, or if the text reads like AI-generated filler, this is a quality demotion.

### 4.6 Assign the score

Apply the quality scoring rule: assign the highest level whose criteria are **fully met**. Section count is necessary but not sufficient: an item that has enough sections for L3 but whose content is thin (L2 depth) scores L2. Content depth across all present sections determines the final level.

Record the score (`qualityLevel`: L0, L1, L2, L3, or L4) and a written rationale explaining why the item meets or falls short of the next level.

---

## 5. Acceptance

An item is accepted when **both** conditions are met:

1. `ComplianceStatus = PASS` (FLAG is acceptable, but must be documented).
2. `qualityLevel >= L2`.

### 5.1 What to do

- Set the item's status to `ACCEPTED`.
- Create a `ReviewDecision` record with:
  - `decision = ACCEPT`
  - `qualityLevel`: the assigned L2/L3/L4 score
  - `complianceStatus`: PASS or FLAG
  - `rationale`: a non-empty written justification for the score. If FLAG, describe the flag and any expected resolution.
  - `reviewerId`: your reviewer identifier.
- Create an `AuditEntry` with `action = ACCEPT`, referencing the `ReviewDecision`.
- Record any coverage gap assessment (curation-rubric.md section 5, condition 6). This is informational: note whether the item fills or overlaps with existing role and style coverage. This does not block acceptance.

### 5.2 Coverage gap note

Check the role tier and style categories of the item against the coverage targets in the rubric (section 5). If the item fills an underrepresented tier or style, note this in the rationale. If multiple items are pending review simultaneously, prioritise items that fill underrepresented tiers. Never reject an item solely because its role or style is overrepresented.

---

## 6. Rejection

An item is rejected when **either** condition is true:

1. `ComplianceStatus = FAIL` (any compliance check failed).
2. `qualityLevel < L2` (score is L0 or L1).

### 6.1 What to do

- Set the item's status to `REJECTED`.
- Create a `ReviewDecision` record with:
  - `decision = REJECT`
  - `qualityLevel`: the assigned score if quality was evaluated (L0 or L1). If compliance failed and quality was not scored, leave null.
  - `complianceStatus`: the compliance outcome.
  - `rejectionReason`: exactly one from the enumerated list below.
  - `rationale`: a non-empty written justification. If multiple reasons apply, select the one highest in the list that definitively applies and note the others in the rationale.
  - `reviewerId`: your reviewer identifier.
- Create an `AuditEntry` with `action = REJECT`, referencing the `ReviewDecision`.

### 6.2 Rejection reasons (from curation-rubric.md §4)

Use exactly these reason codes:

| Code | When to use |
|---|---|
| `QUALITY_BELOW_THRESHOLD` | Quality scored L0 or L1. Content too thin, incomplete, or poorly structured. |
| `COMPLIANCE_FAIL` | One or more mandatory compliance checks failed. Use when the failure does not fit a more specific code below. |
| `MISSING_CONSENT` | No `ConsentRecord` exists, consent `tier` is below `DISPLAY`, or the consent record is invalid. |
| `INCOMPLETE_ATTRIBUTION` | One or more required attribution fields is missing, empty, or unverifiable. Use only when consent and all other checks pass but attribution alone is incomplete. |
| `DUPLICATE` | Exact duplicate: same `sourceUrl` as an existing item. |
| `CROSS_CLONE` | Confirmed cross-creator structural copy. May only be assigned by a senior reviewer after investigation (section 8). |
| `FABRICATED_CREDIBILITY` | Verifiably false claims presented as real (content-quality-principles §6). |
| `STALE_CONTENT` | Item was previously archived as stale and resubmitted without material updates. Also used when rejecting for staleness during an audit cycle. |

### 6.3 Rejection is not permanent

A rejected item may be resubmitted after the creator addresses the rejection reason. Re-submissions enter the normal review workflow. Exact duplicates (`DUPLICATE`) remain blocked: the same `sourceUrl` cannot be resubmitted.

---

## 7. Duplicate Handling

Duplicate detection is manual in v1. There are three cases, each handled differently.

### 7.1 Case 1: Exact duplicate (same sourceUrl)

**Detection**: the item's `sourceUrl` matches an existing `GalleryItem`'s `sourceUrl` (regardless of that item's status).

**Action**: reject with `DUPLICATE`. The rejection rationale must include the ID of the existing item. The existing item is not modified. This check occurs during ingestion (section 2.3) and should be caught before the compliance gate.

### 7.2 Case 2: Structural duplicate (same creator, different URL, same project)

**Detection**: the item comes from the same creator (same `creatorName`) and represents the same portfolio project, but was submitted from a different URL (e.g., the creator's personal site vs. their Behance mirror). Structure and content are recognisably the same body of work.

**Action**: accept the new item as a **variant**. Create a `GalleryItem` record with `duplicateOfId` set to the ID of the first-accepted version of that project. Both items remain in the gallery. Score the quality of this specific variant's presentation independently, not based on the original's score. A variant can receive a different quality level.

### 7.3 Case 3: Cross-creator duplicate (different creator, same structure)

**Detection**: the item appears structurally identical or near-identical to an existing accepted item from a **different** creator, with only the attribution changed. This suggests one creator copied another's work wholesale.

**Action**: you flag the concern. Create a `DUPLICATE_FLAG` audit entry referencing the existing item's ID. Do not reject the item yourself. The item remains `PENDING_REVIEW`. Escalate to a senior reviewer (section 8). The senior reviewer investigates and decides:

- If confirmed as a cross-creator clone: the senior reviewer rejects with `CROSS_CLONE`. The original item stays accepted. The clone is rejected.
- If determined to be coincidental similarity or a shared template: the senior reviewer clears the flag and the item proceeds through normal review. The determination is documented in the rationale.
- If ambiguous: the senior reviewer may request additional information from the submitter. The item remains `PENDING_REVIEW` during investigation.

Only a senior reviewer may assign the `CROSS_CLONE` rejection reason.

---

## 8. Escalation

### 8.1 When to escalate

Escalate to a senior reviewer when:

- **Quality score disagreement**: two reviewers assign quality scores that differ by more than one level (e.g., Reviewer A: L4, Reviewer B: L2). A difference of one level (L3 vs. L2) does not trigger escalation; the lower score stands.
- **Compliance status disagreement**: one reviewer records `PASS` and another records `FAIL` for the same item, or two reviewers disagree on whether a FLAG should be PASS or FAIL.
- **Cross-creator clone suspicion** (section 7.3): regular reviewers flag the concern; only a senior reviewer can confirm and assign `CROSS_CLONE`.

### 8.2 How escalation works

1. Create an `AuditEntry` with `action = ESCALATE`, referencing the item ID and the nature of the disagreement.
2. The item remains in its current status. Do not make a final decision.
3. The senior reviewer performs an independent review: they re-evaluate compliance and quality from scratch, produce their own score and decision.
4. The senior reviewer's decision is **binding**. It is recorded as an `AuditEntry` with `action = OVERRIDE`.
5. The original reviewers' scores and rationales are preserved in the audit log but are superseded by the override. The override entry must reference the original `ReviewDecision` IDs and contain a rationale explaining why the override was necessary.

### 8.3 Senior reviewer authority

The senior reviewer's compliance assessment and quality score are final. There is no appeal above the senior reviewer in v1. Any disagreement with a senior reviewer's override must be raised through the team's internal communication channels, not through the review system.

---

## 9. Emergency Takedown

Any reviewer may immediately suspend an item if they identify a serious issue that cannot wait for normal review.

### 9.1 Triggers

Suspension is warranted when:

- Consent was fraudulently obtained (falsified `consentedBy`, impersonated creator).
- The item is a confirmed cross-creator clone that was previously missed and is now live.
- A legal takedown request from the item's creator, rightsholder, or their legal representative has been received.
- Content, upon re-examination, violates the charter's non-goals (NG1: bulk copying, NG3: no-consent ingestion, NG4: verbatim single-source suggestions from the gallery).

### 9.2 How to suspend

1. Immediately set the item's status to `SUSPENDED`. No other reviewer approval is required.
2. Create an `AuditEntry` with `action = SUSPEND`. The rationale must explain why the emergency action was taken.
3. The application layer must filter out `SUSPENDED` items from all public display surfaces within 5 minutes of the status change (this is an application concern, not your responsibility as a reviewer, but you should verify it happened).

### 9.3 What happens next

Within **48 hours** of suspension, a senior reviewer must conduct a full review. The senior reviewer may:

- **Confirm the suspension**: if the issue is confirmed, change status to `REJECTED`. Record the rejection reason and rationale.
- **Lift the suspension**: if the issue was a false alarm or has been resolved, restore the item to `ACCEPTED` (its previous status). Record the restoration rationale.
- **Escalate further**: if the issue requires charter amendment or a new ADR, escalate to the product owner.

The 48-hour clock starts from the `SUSPEND` audit entry timestamp. If the senior reviewer cannot complete the review within 48 hours, they must document the delay and provide an estimated resolution timeline.

---

## 10. Re-Review

A gallery item is re-reviewed when the creator submits a substantial update to the content.

### 10.1 Trigger

Re-review is triggered when:

- A creator submits an updated version linked to an existing gallery item.
- The item's current status is `ACCEPTED` or `ARCHIVED` (an archived item may be re-reviewed if content has materially changed).

When triggered, the item's status changes to `PENDING_REREVIEW`. An `AuditEntry` with `action = RE_REVIEW` is created, noting the trigger was a creator-initiated update.

### 10.2 Reviewer assignment

Assign the item to the **original reviewer** if they are still active on the team. If the original reviewer is unavailable (left the team, on extended leave, or otherwise cannot review), assign via standard round-robin across the active reviewer team.

The original reviewer's familiarity with the item reduces re-review overhead and improves scoring consistency.

### 10.3 Review scope

Follow the same workflow as initial review: compliance gate (section 3), then quality scoring (section 4), then decision (section 5 or 6).

Focus on **what changed** relative to the previously accepted version. The delta between old and new content is your primary evidence for the quality score. If the delta is trivially small (a single typo fix, a minor styling tweak), you may fast-track the re-review and carry forward the previous score without a full re-evaluation. Document this decision in the rationale.

If the update significantly degraded the item (e.g., the creator removed several case studies and the item now meets L1 criteria), you may reject on re-review despite the item having been previously accepted. A previously accepted item can regress in quality.

### 10.4 Outcome

- **Accepted on re-review**: status returns to `ACCEPTED`. The `reviewedAt` timestamp is updated, resetting the 18-month stale clock. A new `ReviewDecision` is created with the updated score. The previous acceptance decision remains in the audit log as historical context.
- **Rejected on re-review**: status set to `REJECTED`. Record rejection reason and rationale. The previous acceptance is not retroactively invalidated: the item was correctly accepted at the time, and the rejection reflects the current version's deficiencies.

---

## 11. Stale Content

Gallery items can become stale as conventions, technologies, and design patterns evolve. An item that was exemplary when accepted may no longer be a reliable pattern reference.

### 11.1 Staleness threshold

An item is considered stale when **18 months** have passed since its last review (measured from `reviewedAt` on the most recent `ReviewDecision` with `decision = ACCEPT`, or from `acceptedAt` if no re-review has occurred).

### 11.2 Quarterly check

A stale-content audit runs **quarterly** (every 3 months). The reviewer team scans all accepted items and identifies those that have exceeded the 18-month threshold since their last review.

### 11.3 Archival process

For each stale item identified:

1. Set the item's status to `ARCHIVED`.
2. Record a `staleSince` timestamp.
3. Create an `AuditEntry` with `action = ARCHIVE`. The rationale must note that the trigger was the 18-month staleness threshold.
4. Mark any `PatternSignal` records derived from this item as stale via their `staleSince` field. Pattern signals remain in the system but are excluded from future synthesis until re-derived from non-stale sources.

### 11.4 Important rules

- **Archived items are never deleted.** They remain in the database and audit log permanently. They are excluded from active gallery queries, pattern signal derivation, and coverage audits, but their attribution, consent records, and review history are preserved.
- **Archived items may be resubmitted** if the creator updates the content materially. The resubmission follows the re-review workflow (section 10). If the reviewer determines the content has not materially changed since archival, reject with `STALE_CONTENT`.
- **Staleness is a curatorial concern, not a quality judgment.** The item may have been exemplary when accepted. The 18-month threshold reflects the reality that portfolio conventions evolve, not that the item was ever bad.

---

## 12. Consent Revocation

A creator or rightsholder may revoke consent for their portfolio content at any time. This is a binding action under NG3 and R4.

### 12.1 Process

When consent is revoked:

1. **Archive the item immediately.** Set status to `ARCHIVED`. The revocation is the archival trigger.
2. **Mark pattern signals stale.** Any `PatternSignal` derived from this item gets `staleSince` set to the revocation timestamp. Stale signals are excluded from future synthesis.
3. **Preserve the consent record.** Do not delete the `ConsentRecord`. Append a revocation timestamp (`revokedAt`). The record remains for audit traceability.
4. **Create an audit entry.** `action = CONSENT_REVOKE`, with the revocation rationale and the consent record reference.
5. **No auto-renewal.** Consent, once revoked, does not automatically come back. A new, explicit `ConsentRecord` must be created if the creator later decides to re-consent. The original consent record remains as a historical artifact.

### 12.2 Expired consent

If a `ConsentRecord` has a non-null `expiresAt` field and that timestamp has passed, the same process applies: status → `ARCHIVED`, pattern signals → marked stale, audit entry → `CONSENT_REVOKE` (or `ARCHIVE` with a note that consent expired). The 18-month threshold is separate from expiration: consent expiration takes priority and triggers archival immediately.

### 12.3 What revocation means for existing references

- Section-intelligence suggestions that previously used pattern signals from a revoked item are not retroactively removed.
- Future suggestions must use the `staleSince` marker on `PatternSignal` records to exclude stale signals.
- The item's raw content is never served by the gallery after archival. Archived items are excluded from all read paths.

### 12.4 Takedown by platform or legal request

If a third party (platform, organisation, legal representative) requests removal on behalf of the creator, the same revocation process applies. Verify that the `consentedBy` field on the original `ConsentRecord` matches or is traceable to the requesting party. If it does not match, escalate to a senior reviewer (section 8) before taking action.

---

## 13. Reviewer Calibration

To maintain consistency across the reviewer team, a calibration audit runs quarterly. This is a manual process led by a senior reviewer, not an automated system.

### 13.1 What is checked

For each active reviewer, the senior reviewer examines:

- **Acceptance rate distribution**: what percentage of the reviewer's decisions are accept vs. reject. Extreme rates (accepting everything or rejecting everything) suggest the reviewer is not applying the rubric carefully.
- **Average quality score**: the mean quality level the reviewer assigns. If one reviewer consistently scores items a full level above or below the team average for the same cohort, the rubric may not be applied consistently.
- **Escalation rate**: how often the reviewer's decisions trigger escalations. A high escalation rate suggests the reviewer's assessments frequently diverge from peers.

### 13.2 Outlier threshold

A reviewer is flagged for calibration review when any of their metrics falls **more than 2 standard deviations (>2σ)** from the team mean. This is a statistical flag, not a disciplinary one. The purpose is to identify reviewers who may need a rubric refresher.

### 13.3 Calibration review

For flagged reviewers:

1. The senior reviewer selects a sample of the reviewer's recent decisions (at least 5).
2. The senior reviewer independently re-evaluates each item against the rubric.
3. The senior reviewer discusses discrepancies with the reviewer one-on-one.
4. If systematic misalignment is found (the reviewer consistently misapplies a specific rule), the senior reviewer provides targeted guidance.
5. The calibration review and its outcome are documented in the reviewer's internal record (not in the gallery audit log).

Calibration reviews are not overrides: they do not retroactively change past decisions. They exist to ensure future decisions are consistent.

---

## 14. What Is NOT in This Runbook

This runbook covers the human review workflow for v1. The following are explicitly excluded:

1. **Automated duplicate detection.** Duplicate detection is manual in v1. There is no embedding-based similarity search, no automated `sourceUrl` deduplication beyond the reviewer's ingestion check. Automated duplicate detection belongs to a future version.

2. **Automated originality scoring.** The `structureFingerprint` and `contentHash` fields exist in the schema (ADR-0002, Decision 5), but the originality-score algorithm, threshold, and enforcement level (warn vs. block) are deferred per R8. This runbook does not describe an automated originality check.

3. **Notification and email workflow.** This runbook describes manual reviewer actions. It does not cover automated notifications (email alerts when an item enters `PENDING_REVIEW`, Slack messages for escalations, creator notifications for acceptance/rejection). Notification infrastructure is a separate concern.

4. **Appeals process** (deferred). There is no formal appeals process in v1. A creator whose item is rejected may resubmit with updates. Disagreement with a senior reviewer's override must be raised through the team's internal communication channels. A formal appeals mechanism is deferred to a future version.

5. **Batch ingestion.** Every item is reviewed individually. There is no workflow for bulk-importing multiple portfolios, bulk-reviewing a set of items, or batch-accepting a curated collection. Batch ingestion workflows, if needed, belong to a future version.

---

## Cross-References

- **`docs/product/curation-rubric.md`** (Task 3): parent standard. Defines quality levels, compliance checks, rejection reasons, duplicate handling, stale policy, consent revocation, audit history, re-review, and escalation. This runbook operationalises that standard.
- **`docs/product/originality-rules.md`**: R1 (no verbatim cloning) enforced by duplicate handling and cross-creator clone check. R3 (attribution travels with content) enforced by compliance check 1 and attribution integrity check. R4 (consent-gated ingestion) enforced by compliance check 2 and consent revocation policy. R8 (similarity monitoring) is deferred: the schema reserves fields but no algorithm exists yet.
- **`docs/product/content-quality-principles.md`**: §6 (no fabricated credibility) enforced by compliance check 4. §8 (accessibility as quality dimension) enforced during quality scoring (L3/L4 differentiation).
- **`docs/adr/0002-gallery-schema-design.md`**: defines the status lifecycle (`PENDING_REVIEW → ACCEPTED/REJECTED → PENDING_REREVIEW → ARCHIVED/SUSPENDED`), consent model (`ConsentRecord` with tiered rights), attribution model (non-nullable FK), append-only audit log, and reserved originality fields. All status transitions, audit actions, and data models referenced in this runbook are defined there.
- **`docs/product/success-metrics.md`**: guardrail metrics (lines 21-28) that reviewer adherence supports: originality score (enforced by duplicate/cross-clone checks), attribution integrity (enforced by compliance checks 1 and 5), agent-authored-content disclosure rate (separate concern, not enforced by this runbook), accessibility compliance rate (reflected in quality scoring §4.4).
