// ─── Abuse Case Tests (plan T13) ──────────────────────────────────────────────
// Abuse-pattern contract tests for the provenance domain. Each threat has a
// named failing fixture and an exact rejection code; safe synthetic fixtures
// pass. NO real personal data — all fixtures synthetic (RFC 2606 .invalid).
//
// Threats covered:
//   1. copy laundering (re-registering a source under a permissive licence)
//   2. single-source paraphrase descriptors (R2 floor, policy §10.1)
//   3. forged consent / provenance state (policy §5.2, §9)
//   4. telemetry redaction (policy §12)
// ────────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from "vitest";

import type { ProvenanceTelemetryEvent } from "@/domain/provenance/types";
import {
  ClaimStatusSchema,
  RemovalRecordSchema,
  StructuralLessonSchema,
} from "@/domain/provenance/schemas";
import { makeRepo, makeService, registerInput, TS } from "./provenance-test-fakes";

// ─── 1. Copy laundering (re-registration under a permissive licence) ───────────

describe("abuse: copy laundering via re-registration", () => {
  it("a second registration cannot inherit a permission the new declaration does not grant", async () => {
    const repo = makeRepo();
    const svc = makeService([], repo);

    // Legitimate registration: permissive declaration grants PATTERN_DERIVE.
    const first = await svc.registerArtifact(registerInput());
    expect(first.permission).toBe("PATTERN_DERIVE");

    // Laundering attempt: re-register the SAME canonicalUrl declaring an ND
    // licence + FULL consent. The service must recompute the permission from
    // the NEW declaration (DISPLAY_ONLY) — it must NOT inherit the earlier
    // PATTERN_DERIVE permission from the stored row.
    const second = await svc.registerArtifact(
      registerInput({
        permission: { licence: "CC_BY_ND", consentTier: "FULL", intendedUse: "DISPLAY_ONLY" },
      }),
    );
    expect(second.duplicated).toBe(true);
    expect(second.permission).toBe("DISPLAY_ONLY");
    expect(second.sourceRecordId).toBe(first.sourceRecordId);

    // The original SourceRecord row is NOT mutated by the second registration.
    const stored = await repo.findSourceRecordByCanonicalUrl("https://example.invalid/portfolio");
    expect(stored?.creatorId).toBe(first.creatorId);
    expect(repo.createSourceRecord).toHaveBeenCalledTimes(1);
  });

  it("a laundering attempt with derivation intent under ND is rejected outright", async () => {
    const repo = makeRepo();
    const svc = makeService([], repo);
    await expect(
      svc.registerArtifact(
        registerInput({
          permission: { licence: "CC_BY_ND", consentTier: "PATTERN_DERIVE", intendedUse: "PATTERN_DERIVE" },
        }),
      ),
    ).rejects.toThrow(/do not permit pattern derivation/);
    expect(repo.createSourceRecord).not.toHaveBeenCalled();
  });

  it("registering the same canonicalUrl twice creates exactly one source row", async () => {
    const repo = makeRepo();
    const svc = makeService([], repo);
    await svc.registerArtifact(registerInput());
    await svc.registerArtifact(registerInput());
    expect(repo.createSourceRecord).toHaveBeenCalledTimes(1);
    const stored = await repo.findSourceRecordByCanonicalUrl("https://example.invalid/portfolio");
    expect(stored).not.toBeNull();
  });
});

// ─── 2. Single-source paraphrase descriptors (policy §10.1) ───────────────────

describe("abuse: single-source paraphrase descriptors", () => {
  const validLesson = {
    patternType: "hero_layout",
    sourceItemCount: 3,
    distinctCreatorCount: 2,
    sectionFrequency: { hero: 3, about: 2 },
    commonTags: ["minimal", "editorial"],
    averageSectionCount: 4.5,
  };

  it("rejects a lesson aggregated from a single item (item count 1)", () => {
    const r = StructuralLessonSchema.safeParse({ ...validLesson, sourceItemCount: 1 });
    expect(r.success).toBe(false);
  });

  it("rejects a lesson aggregated from two items", () => {
    expect(StructuralLessonSchema.safeParse({ ...validLesson, sourceItemCount: 2 }).success).toBe(false);
  });

  it("rejects a lesson that embeds a single item's verbatim content", () => {
    const r = StructuralLessonSchema.safeParse({ ...validLesson, verbatimSnippet: "their exact hero copy" });
    expect(r.success).toBe(false);
  });

  it("rejects a lesson carrying per-item content arrays", () => {
    const r = StructuralLessonSchema.safeParse({ ...validLesson, sourceContent: ["item1 html", "item2 html"] });
    expect(r.success).toBe(false);
  });

  it("rejects non-aggregate sectionFrequency values (paraphrase laundering)", () => {
    const r = StructuralLessonSchema.safeParse({ ...validLesson, sectionFrequency: { hero: "lots" } });
    expect(r.success).toBe(false);
  });

  it("rejects an oversized commonTags list (max 100)", () => {
    const r = StructuralLessonSchema.safeParse({
      ...validLesson,
      commonTags: Array.from({ length: 101 }, (_, i) => `tag-${i}`),
    });
    expect(r.success).toBe(false);
  });

  it("accepts the safe synthetic aggregate lesson", () => {
    expect(StructuralLessonSchema.safeParse(validLesson).success).toBe(true);
  });
});

// ─── 3. Forged consent / provenance state ─────────────────────────────────────

describe("abuse: forged consent/provenance state", () => {
  it("rejects a FULL intent claim under DISPLAY consent", async () => {
    const repo = makeRepo();
    const svc = makeService([], repo);
    await expect(
      svc.registerArtifact(
        registerInput({
          permission: { licence: "CC_BY", consentTier: "DISPLAY", intendedUse: "FULL" },
        }),
      ),
    ).rejects.toThrow(/effective permission is DISPLAY_ONLY/);
    expect(repo.createSourceRecord).not.toHaveBeenCalled();
  });

  it("rejects a COMPLETED removal without an EFFECTIVE predecessor (illegal transition)", () => {
    const base = {
      id: "rem-1",
      itemId: "item-1",
      status: "COMPLETED" as const,
      requestedBy: "reviewer-1",
      reason: "creator request",
      requestedAt: TS,
      effectiveAt: null,
      completedAt: null,
      createdAt: TS,
    };
    expect(RemovalRecordSchema.safeParse(base).success).toBe(false);
  });

  it("rejects completedAt preceding effectiveAt (chronology forgery)", () => {
    const r = RemovalRecordSchema.safeParse({
      id: "rem-2",
      itemId: "item-1",
      status: "COMPLETED",
      requestedBy: "reviewer-1",
      reason: "creator request",
      requestedAt: TS,
      effectiveAt: "2026-08-07T00:00:00.000Z",
      completedAt: "2026-08-06T00:00:00.000Z",
      createdAt: TS,
    });
    expect(r.success).toBe(false);
  });

  it("rejects an unknown claim status (state forgery)", () => {
    expect(ClaimStatusSchema.safeParse("AUTO_ACCEPTED").success).toBe(false);
  });
});

// ─── 4. Telemetry redaction (policy §12) ──────────────────────────────────────

describe("abuse: telemetry redaction", () => {
  it("no telemetry event from a full flow contains contact, raw content, or prompts", async () => {
    const repo = makeRepo();
    const events: ProvenanceTelemetryEvent[] = [];
    const svc = makeService(events, repo);

    await svc.registerArtifact(
      registerInput({
        aiProvenance: {
          provider: "openai",
          modelName: "gpt-4o",
          generatedAt: TS,
          disclosureStatus: "AI_GENERATED",
          promptHash: "a".repeat(64),
          outputHash: "b".repeat(64),
        },
      }),
    );
    const claim = await svc.fileClaim({
      itemId: "item-1",
      claimantName: "Synthetic Claimant",
      claimantContact: "claimant@example.invalid",
    });
    await svc.resolveClaim({
      claimId: claim.id,
      decision: "REJECTED",
      resolvedBy: "reviewer-1",
      resolution: "proof does not match",
    });
    await svc.requestRemoval({ itemId: "item-1", requestedBy: "reviewer-1", reason: "duplicate" });

    const serialized = JSON.stringify(events);
    // Private claimant data — never in telemetry.
    expect(serialized).not.toContain("claimant@example.invalid");
    expect(serialized).not.toContain("claimantName");
    expect(serialized).not.toContain("claimantContact");
    // Raw content / prompts — never in telemetry.
    expect(serialized).not.toContain("rawPrompt");
    expect(serialized).not.toContain("promptHash");
    expect(serialized).not.toContain("outputHash");
    expect(serialized).not.toContain("contentBlob");

    // The flow produced exactly the expected redacted event set (successful
    // registrations emit no telemetry; only failures emit INCOMPLETE_PROVENANCE).
    const types = events.map((e) => e.type).sort();
    expect(types).toEqual(["CLAIM_CREATED", "CLAIM_RESOLVED", "REMOVAL_REQUESTED"]);
  });
});
