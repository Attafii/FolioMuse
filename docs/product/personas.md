# FolioMuse — Target Personas

Parent document: `docs/product/charter.md`

## P1 — The Builder (primary persona)

**Who:** An individual professional (designer, developer, writer, photographer, PM, etc.) who has real work to showcase but is unsure how to structure or present it.

**Context:** Actively job-hunting, freelancing, or refreshing an existing portfolio that feels outdated or generic.

**Goals:**
- Present their actual work clearly and credibly.
- Understand what "good" looks like without spending hours studying dozens of unrelated sites.
- Get concrete, section-specific feedback rather than generic "make it better" advice.

**Frustrations:**
- Existing portfolio builders produce generic-looking sites.
- Generic AI writing tools produce content that doesn't sound like them.
- Templates don't tell you *why* a layout works, just that it exists.

**Relationship to non-goals:** Must never be offered a "copy this portfolio" shortcut — P1's trust in FolioMuse depends on output feeling authentically theirs.

## P2 — The Explorer

**Who:** Someone earlier in their career/field (student, career-changer, junior professional) who doesn't yet have a strong portfolio, or has very little content to showcase.

**Context:** Browsing for inspiration and structural understanding before they've produced much work of their own.

**Goals:**
- Understand what sections/structure a portfolio in their field typically needs.
- Build confidence about what "enough" looks like for a first version.
- Avoid feeling like they need to copy someone else's site to look credible.

**Frustrations:**
- Feeling like they have "nothing to show" compared to gallery examples.
- Risk of over-indexing on one inspiring example and copying it too closely.

**Relationship to non-goals:** The gallery must clearly frame examples as *patterns to learn from*, not templates to fill in — reinforces NG1/NG4.

## P3 — The Agent Operator

**Who:** A user who prefers to work through conversational or programmatic tooling (e.g., driving edits via an AI assistant connected through MCP) rather than manually operating a UI.

**Context:** Comfortable with AI tools generally; wants to describe intent ("tighten my hero section", "add a case study for Project X") and have the agent apply it, using their own content.

**Goals:**
- Make structural or content edits through natural-language instructions.
- Trust that the agent is using section-intelligence signals grounded in real patterns, not fabricating advice.
- Keep full ownership/authorship of the resulting content.

**Frustrations:**
- Agents that hallucinate suggestions unrelated to real portfolio patterns.
- Agents that silently pull in content from other sources without disclosure.

**Relationship to non-goals:** The MCP agent must never fetch and insert another user's gallery content directly into P3's portfolio (NG1/NG4) — all agent output must be traceable to the user's own inputs plus synthesized (not copied) guidance.

## Persona prioritization for v1

1. P1 (Builder) — primary, drives core UX decisions.
2. P2 (Explorer) — secondary, shapes gallery framing and onboarding.
3. P3 (Agent Operator) — secondary, shapes MCP tool design; does not need a distinct UI beyond what P1 has.
