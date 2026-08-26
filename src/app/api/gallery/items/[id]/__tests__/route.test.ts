// GET /api/gallery/items/[id] route tests (plan portfolio-detail-page T7).
// Factory-based: injects a loader returning PortfolioDetail | null so no DB is
// required. Asserts 200 with strict safe DTO, 404 for hidden/unknown, 500
// opaque on failure, and Cache-Control no-store.

import { describe, it, expect } from "vitest";

import { createDetailGet } from "@/app/api/gallery/items/[id]/route";
import { PortfolioDetailSchema, type PortfolioDetail } from "@/domain/curation/detail-schemas";

function jsonDetail(id: string): PortfolioDetail {
  const raw = {
    id,
    title: "Editorial Sample Portfolio",
    creatorRole: "Product Designer",
    styleTags: ["minimal", "editorial"],
    qualityLevel: "L3",
    complianceStatus: "PASS",
    status: "ACCEPTED",
    attribution: {
      creatorName: "Jane Doe",
      sourceUrl: "https://jane-doe.com/portfolio",
      licenseType: "EXPLICIT_PERMISSION",
      consentDate: "2026-01-15T00:00:00.000Z",
    },
    consentTier: "FULL",
    reviewedAt: "2026-06-01T12:00:00.000Z",
    duplicateOfId: null,
    mediaUrl: null,
    stackTags: ["React"],
    desktopMediaUrl: null,
    mobileMediaUrl: null,
    pageIndex: [],
    sections: null,
    strengths: null,
    stackEvidence: null,
    captureFreshness: { capturedAt: null, label: null },
    similarExamples: [],
  };
  return PortfolioDetailSchema.parse(raw);
}

function getRequest(id: string): Request {
  return new Request(`http://localhost:3000/api/gallery/items/${id}`, { method: "GET" });
}

describe("GET /api/gallery/items/[id]", () => {
  it("returns 200 with the strict safe detail for an eligible record", async () => {
    const GET = createDetailGet(async (id) => (id === "item-123" ? jsonDetail("item-123") : null));
    const res = await GET(getRequest("item-123"), { params: Promise.resolve({ id: "item-123" }) });

    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    const body = await res.json();
    const parsed = PortfolioDetailSchema.safeParse(body);
    expect(parsed.success).toBe(true);
    expect(body.id).toBe("item-123");
  });

  it("returns 404 for unknown or hidden records", async () => {
    const GET = createDetailGet(async () => null);
    const res = await GET(getRequest("item-hidden"), { params: Promise.resolve({ id: "item-hidden" }) });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body).toEqual({ error: "not_found" });
  });

  it("never returns private/raw fields in the response", async () => {
    const GET = createDetailGet(async (id) => jsonDetail(id));
    const res = await GET(getRequest("item-123"), { params: Promise.resolve({ id: "item-123" }) });
    const body = await res.json();
    for (const forbidden of ["claimantContact", "contentBlob", "structureJSON", "evidenceHash", "promptHash", "outputHash"]) {
      expect(forbidden in body, `forbidden field ${forbidden}`).toBe(false);
    }
  });

  it("returns an opaque 500 when the loader throws", async () => {
    const GET = createDetailGet(async () => {
      throw new Error("boom");
    });
    const res = await GET(getRequest("item-123"), { params: Promise.resolve({ id: "item-123" }) });
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toEqual({ error: "detail_unavailable" });
    expect(JSON.stringify(body)).not.toContain("boom");
  });
});
