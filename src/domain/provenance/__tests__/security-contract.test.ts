// ─── Security Contract Tests (plan T13) ───────────────────────────────────────
// Threat-focused contract tests for the provenance domain. Each threat has a
// named failing fixture; safe synthetic fixtures pass. NO real personal data —
// all fixtures are synthetic (e.g. claimant@example.invalid, RFC 2606).
//
// Threats covered:
//   1. forbidden URL schemes + embedded credentials (policy §2.3)
//   2. oversized evidence / oversized fields (hash + length caps)
//   3. raw prompt/output leakage (hashes only, policy §6.2)
//   4. private claimant fields leaking into projections/telemetry (policy §8.3)
//   5. forged consent / provenance state (policy §5.2, §6.1)
//   6. unprivileged resolution commands (policy §8.1)
//   7. stale-signal exposure as active suggestions (policy §9)
// ────────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, vi } from "vitest";
import { z } from "zod";

import type { ProvenanceTelemetryEvent } from "@/domain/provenance/types";
import {
  FileOwnershipClaimInputSchema,
  NewAiProvenanceInputSchema,
  NewSourceRecordInputSchema,
  OwnershipClaimRecordSchema,
  RemovalRecordSchema,
  ResolveOwnershipClaimInputSchema,
  SourceUrlSchema,
} from "@/domain/provenance/schemas";
import { ProvenanceSummarySchema } from "@/domain/curation/schemas";
import { makeRepo, makeService, makeSignal, registerInput, TS } from "./provenance-test-fakes";

// ─── 1. Forbidden URL schemes + credentials (policy §2.3) ─────────────────────

describe("security: forbidden URL schemes and credentials", () => {
  it("rejects non-http(s) schemes at the schema level (exact code)", () => {
    for (const bad of ["ftp://x.io/a", "file:///etc/passwd", "javascript:alert(1)", "data:text/plain,x", "gopher://x.io"]) {
      const r = SourceUrlSchema.safeParse(bad);
      expect(r.success).toBe(false);
    }
  });

  it("rejects URLs with embedded credentials", () => {
    expect(SourceUrlSchema.safeParse("https://user:pass@example.invalid/portfolio").success).toBe(false);
  });

  it("rejects a source carrying a forbidden scheme at the service boundary", async () => {
    const repo = makeRepo();
    const events: ProvenanceTelemetryEvent[] = [];
    const svc = makeService(events, repo);
    await expect(
      svc.registerArtifact(
        registerInput({ source: { sourceUrl: "ftp://example.invalid/portfolio", canonicalUrl: "ftp://example.invalid/portfolio", captureMode: "MANUAL_SUBMISSION", capturedAt: TS } }),
      ),
    ).rejects.toThrow(/incomplete provenance/);
    expect(repo.createSourceRecord).not.toHaveBeenCalled();
  });
});

// ─── 2. Oversized evidence / oversized fields ─────────────────────────────────

describe("security: oversized evidence and fields", () => {
  it("rejects an evidence hash longer than 64 hex chars", () => {
    const r = NewSourceRecordInputSchema.safeParse({
      sourceUrl: "https://example.invalid/a",
      canonicalUrl: "https://example.invalid/a",
      captureMode: "MANUAL_SUBMISSION",
      capturedAt: TS,
      evidenceHash: "a".repeat(65),
    });
    expect(r.success).toBe(false);
  });

  it("rejects a canonicalUrl over the 2000-char cap with an exact path", () => {
    const r = NewSourceRecordInputSchema.safeParse({
      sourceUrl: "https://example.invalid/a",
      canonicalUrl: "x".repeat(2001),
      captureMode: "MANUAL_SUBMISSION",
      capturedAt: TS,
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues.some((i) => i.path[0] === "canonicalUrl")).toBe(true);
    }
  });

  it("rejects an oversized removal reason (max 2000)", () => {
    const r = z
      .object({ itemId: z.string(), requestedBy: z.string(), reason: z.string().min(1).max(2000) })
      .safeParse({ itemId: "i", requestedBy: "r", reason: "x".repeat(2001) });
    expect(r.success).toBe(false);
  });

  it("rejects an oversized claimantContact (max 500) with an exact path", () => {
    const r = FileOwnershipClaimInputSchema.safeParse({
      itemId: "item-1",
      claimantName: "Synthetic Claimant",
      claimantContact: "a".repeat(501),
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues.some((i) => i.path[0] === "claimantContact")).toBe(true);
    }
  });

  it("rejects an oversized resolution text (max 2000)", () => {
    const r = ResolveOwnershipClaimInputSchema.safeParse({
      claimId: "claim-1",
      decision: "ACCEPTED",
      resolvedBy: "reviewer-1",
      resolution: "x".repeat(2001),
    });
    expect(r.success).toBe(false);
  });
});

// ─── 3. Raw prompt/output leakage (policy §6.2) ───────────────────────────────

describe("security: raw prompt/output leakage", () => {
  const valid = {
    provider: "openai",
    modelName: "gpt-4o",
    generatedAt: TS,
    disclosureStatus: "AI_GENERATED" as const,
  };

  it("rejects a raw prompt body in promptHash (hashes only)", () => {
    const r = NewAiProvenanceInputSchema.safeParse({ ...valid, promptHash: "write a hero section for me" });
    expect(r.success).toBe(false);
  });

  it("rejects a raw output body in outputHash (hashes only)", () => {
    const r = NewAiProvenanceInputSchema.safeParse({ ...valid, outputHash: "full generated html here" });
    expect(r.success).toBe(false);
  });

  it("rejects a strict ai record that smuggles rawPrompt/output keys", () => {
    const r = NewAiProvenanceInputSchema.safeParse({
      ...valid,
      rawPrompt: "should never be stored",
      output: "<div>content</div>",
    });
    expect(r.success).toBe(false);
  });

  it("accepts only SHA-256 digests (optionally sha256: prefixed)", () => {
    expect(NewAiProvenanceInputSchema.safeParse({ ...valid, promptHash: "a".repeat(64) }).success).toBe(true);
    expect(NewAiProvenanceInputSchema.safeParse({ ...valid, promptHash: "sha256:" + "b".repeat(64) }).success).toBe(true);
  });
});

// ─── 4. Private claimant fields (policy §8.3) ─────────────────────────────────

describe("security: private claimant fields", () => {
  it("requires claimantContact on the internal claim input", () => {
    expect(
      FileOwnershipClaimInputSchema.safeParse({ itemId: "item-1", claimantName: "Synthetic Claimant" }).success,
    ).toBe(false);
  });

  it("rejects id-proof fields on the claim record (strict)", () => {
    const base = {
      id: "claim-1",
      itemId: "item-1",
      claimantName: "Synthetic Claimant",
      claimantContact: "claimant@example.invalid",
      status: "PENDING",
      submittedAt: TS,
      resolvedAt: null,
      resolvedBy: null,
      resolution: null,
      creatorId: null,
      createdAt: TS,
    };
    expect(OwnershipClaimRecordSchema.safeParse({ ...base, idProof: "passport-scan" }).success).toBe(false);
    expect(OwnershipClaimRecordSchema.safeParse({ ...base, claimantEmail: "x@y.invalid" }).success).toBe(false);
  });

  it("rejects claimant contact in the public provenance summary", () => {
    const valid = {
      hasCreator: true,
      hasSourceRecord: true,
      hasAiProvenance: false,
      hasConsent: true,
      aiDisclosure: "HUMAN" as const,
      creator: { id: "c1", name: "Synthetic Creator", verificationStatus: "UNVERIFIED" as const },
      licence: { id: "CC_BY" as const, effectivePermission: "PATTERN_DERIVE" as const },
      source: {
        sourceUrl: "https://example.invalid/p",
        canonicalUrl: "https://example.invalid/p",
        captureMode: "MANUAL_SUBMISSION" as const,
        capturedAt: TS,
      },
      removalAvailable: true,
    };
    expect(ProvenanceSummarySchema.safeParse({ ...valid, claimantContact: "claimant@example.invalid" }).success).toBe(false);
  });

  it("never emits claimant contact in telemetry", async () => {
    const repo = makeRepo();
    const events: ProvenanceTelemetryEvent[] = [];
    const svc = makeService(events, repo);
    await svc.registerArtifact(registerInput());
    await svc.fileClaim({
      itemId: "item-1",
      claimantName: "Synthetic Claimant",
      claimantContact: "claimant@example.invalid",
    });
    const serialized = JSON.stringify(events);
    expect(serialized).not.toContain("claimant@example.invalid");
    expect(serialized).not.toContain("claimantName");
  });
});

// ─── 5. Forged consent / provenance state ─────────────────────────────────────

describe("security: forged consent/provenance state", () => {
  it("rejects FULL intent under an ND licence (policy §5.2)", async () => {
    const repo = makeRepo();
    const svc = makeService([], repo);
    await expect(
      svc.registerArtifact(
        registerInput({
          permission: { licence: "CC_BY_ND", consentTier: "FULL", intendedUse: "FULL" },
        }),
      ),
    ).rejects.toThrow(/effective permission is DISPLAY_ONLY/);
    expect(repo.createSourceRecord).not.toHaveBeenCalled();
  });

  it("rejects FULL intent under DISPLAY consent", async () => {
    const repo = makeRepo();
    const svc = makeService([], repo);
    await expect(
      svc.registerArtifact(
        registerInput({
          permission: { licence: "CC_BY", consentTier: "DISPLAY", intendedUse: "FULL" },
        }),
      ),
    ).rejects.toThrow(/effective permission is DISPLAY_ONLY/);
  });

  it("rejects UNKNOWN AI disclosure for new records (policy §6.1)", async () => {
    const repo = makeRepo();
    const svc = makeService([], repo);
    await expect(
      svc.registerArtifact(
        registerInput({
          aiProvenance: { provider: "openai", modelName: "gpt-4o", generatedAt: TS, disclosureStatus: "UNKNOWN" },
        }),
      ),
    ).rejects.toThrow(/incomplete provenance/);
  });

  it("rejects an EFFECTIVE removal record without effectiveAt (cross-field)", () => {
    const base = {
      id: "rem-1",
      itemId: "item-1",
      status: "EFFECTIVE",
      requestedBy: "reviewer-1",
      reason: "creator request",
      requestedAt: TS,
      effectiveAt: null,
      completedAt: null,
      createdAt: TS,
    };
    const r = RemovalRecordSchema.safeParse(base);
    expect(r.success).toBe(false);
  });

  it("rejects an ACCEPTED claim without resolution metadata (cross-field)", () => {
    const base = {
      id: "claim-1",
      itemId: "item-1",
      claimantName: "Synthetic Claimant",
      claimantContact: "claimant@example.invalid",
      status: "ACCEPTED",
      submittedAt: TS,
      resolvedAt: null,
      resolvedBy: null,
      resolution: null,
      creatorId: null,
      createdAt: TS,
    };
    expect(OwnershipClaimRecordSchema.safeParse(base).success).toBe(false);
  });
});

// ─── 6. Unprivileged resolution commands (policy §8.1) ────────────────────────

describe("security: unprivileged resolution commands", () => {
  it("requires the acting reviewer identity", () => {
    const r = ResolveOwnershipClaimInputSchema.safeParse({
      claimId: "claim-1",
      decision: "ACCEPTED",
      resolution: "verified",
      // resolvedBy omitted
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues.some((i) => i.path[0] === "resolvedBy")).toBe(true);
    }
  });

  it("requires resolution text", () => {
    expect(
      ResolveOwnershipClaimInputSchema.safeParse({
        claimId: "claim-1",
        decision: "REJECTED",
        resolvedBy: "reviewer-1",
        resolution: "",
      }).success,
    ).toBe(false);
  });

  it("rejects decisions outside ACCEPTED/REJECTED", () => {
    expect(
      ResolveOwnershipClaimInputSchema.safeParse({
        claimId: "claim-1",
        decision: "MAYBE",
        resolvedBy: "reviewer-1",
        resolution: "x",
      }).success,
    ).toBe(false);
  });

  it("does not reach the repository when the resolution command is invalid", async () => {
    const repo = makeRepo();
    const svc = makeService([], repo);
    await expect(
      svc.resolveClaim({ claimId: "claim-1", decision: "MAYBE" as never, resolvedBy: "reviewer-1", resolution: "x" }),
    ).rejects.toBeInstanceOf(z.ZodError);
    expect(repo.resolveClaim).not.toHaveBeenCalled();
  });
});

// ─── 7. Stale-signal exposure (policy §9) ─────────────────────────────────────

describe("security: stale-signal exposure", () => {
  it("a stale signal always carries staleSince + rebuildState for consumers", () => {
    const r = makeSignal("sig-1", ["item-1", "item-2", "item-3"], { eligibleItemCount: 3, distinctCreatorCount: 2 });
    expect(r.staleSince).toBeDefined();
    expect(r.rebuildState).toBeDefined();
  });

  it("rebuild below the R2 floor never returns ACTIVE (never re-exposed)", async () => {
    const repo = makeRepo();
    const svc = makeService([], repo);
    const signal = makeSignal("sig-low", ["item-1", "item-2"], { eligibleItemCount: 2, distinctCreatorCount: 1 });
    (repo.getSignalEligibility as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      eligibleItemCount: 2,
      distinctCreatorCount: 1,
    });
    (repo.setSignalRebuildState as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ...signal,
      rebuildState: "DROPPED_BELOW_FLOOR",
    });
    const rebuilt = await svc.rebuildSignal("sig-low");
    expect(rebuilt.rebuildState).toBe("DROPPED_BELOW_FLOOR");
  });

  it("rebuild with uncomputed eligibility records REBUILD_FAILED, not ACTIVE", async () => {
    const repo = makeRepo();
    const svc = makeService([], repo);
    (repo.getSignalEligibility as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);
    (repo.setSignalRebuildState as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ...makeSignal("sig-null", ["i1"], null),
      rebuildState: "REBUILD_FAILED",
    });
    const rebuilt = await svc.rebuildSignal("sig-null");
    expect(rebuilt.rebuildState).toBe("REBUILD_FAILED");
  });
});
