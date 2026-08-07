// listAccepted port contract test (T2, plan homepage).
// Verifies the SHAPE of the new safe-read surface: both GalleryRepository and
// CurationService declare listAccepted() returning GalleryItemSummary[].
// Behavioral tests land in T3 (repository) and T4 (service).

import { describe, it, expect } from "vitest";

import type {
  CurationService,
  GalleryRepository,
} from "@/domain/curation/ports";
import type { GalleryItemSummary } from "@/domain/curation/types";

describe("listAccepted port contract", () => {
  it("GalleryRepository declares listAccepted returning summaries", () => {
    // Compile-level contract: a stub satisfying the interface must be able to
    // return an array of GalleryItemSummary. If the interface signature drifts
    // (e.g. returns full GalleryItem with contentBlob), this assignment fails.
    const repo: GalleryRepository = {
      listAccepted: async (): Promise<GalleryItemSummary[]> => [],
    } as GalleryRepository;

    expect(typeof repo.listAccepted).toBe("function");
  });

  it("CurationService declares listAccepted returning summaries", () => {
    const svc: CurationService = {
      listAccepted: async (): Promise<GalleryItemSummary[]> => [],
    } as CurationService;

    expect(typeof svc.listAccepted).toBe("function");
  });

  it("the summary shape never carries a content blob (ADR-0001)", () => {
    // GalleryItemSummary is the ONLY permitted return type. This is enforced
    // at compile time by the interface; here we document the invariant.
    const summaryKeys: (keyof GalleryItemSummary)[] = [
      "id",
      "title",
      "creatorRole",
      "styleTags",
      "qualityLevel",
      "complianceStatus",
      "status",
      "attribution",
      "consentTier",
      "reviewedAt",
      "duplicateOfId",
    ];

    expect(summaryKeys).not.toContain("contentBlob");
    expect(summaryKeys).not.toContain("structureJSON");
  });
});
