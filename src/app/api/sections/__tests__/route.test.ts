// Section API route tests (plan section-library-detail T7).
// Factory-based with in-memory providers: 200 safe list/detail, 404 hidden,
// 400 invalid filter, 500 opaque, no private/raw fields.

import { describe, it, expect } from "vitest";

import { createSectionsGet } from "@/app/api/sections/route";
import { createSectionDetailGet } from "@/app/api/sections/[id]/route";
import type { SectionRowProvider } from "@/domain/sections/section-service";
import type { SectionRecordRow } from "@/domain/curation/section-schemas";

function row(id: string, overrides: Record<string, unknown> = {}): SectionRecordRow {
  return {
    id,
    sectionType: "hero",
    title: `Section ${id}`,
    desktopCropUrl: "https://cdn.example.com/crop.webp",
    mobileCropUrl: null,
    lessons: [{ code: "CLARITY", label: "Clear single message" }],
    doNotCopyNote: "Do not copy this section verbatim.",
    itemId: `item-${id}`,
    creatorName: "Jane Doe",
    creatorRole: "Product Designer",
    styleTags: ["minimal"],
    stackTags: ["React"],
    sourceUrl: "https://jane-doe.com/portfolio",
    licenseType: "EXPLICIT_PERMISSION",
    consentDate: "2026-01-15T00:00:00.000Z",
    status: "ACCEPTED",
    complianceStatus: "PASS",
    consentRevokedAt: null,
    ...overrides,
  };
}

function provider(rows: SectionRecordRow[]): SectionRowProvider {
  return {
    listRows: async () => rows,
    findRowById: async (id) => rows.find((r) => r.id === id) ?? null,
  };
}

describe("GET /api/sections", () => {
  it("returns 200 with safe card projections (eligible only)", async () => {
    const GET = createSectionsGet(provider([
      row("ok"),
      row("hidden", { status: "SUSPENDED" }),
    ]));
    const res = await GET(new Request("http://localhost:3000/api/sections"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.count).toBe(1);
    expect(body.items[0].id).toBe("ok");
    expect("claimantContact" in body.items[0]).toBe(false);
    expect("contentBlob" in body.items[0]).toBe(false);
  });

  it("filters by sectionType", async () => {
    const GET = createSectionsGet(provider([row("a"), row("b", { sectionType: "timeline" })]));
    const res = await GET(new Request("http://localhost:3000/api/sections?sectionType=timeline"));
    const body = await res.json();
    expect(body.items.map((i: { id: string }) => i.id)).toEqual(["b"]);
  });

  it("returns 400 for an invalid sectionType filter", async () => {
    const GET = createSectionsGet(provider([]));
    const res = await GET(new Request("http://localhost:3000/api/sections?sectionType=bogus"));
    expect(res.status).toBe(400);
  });

  it("returns an opaque 500 on provider failure", async () => {
    const GET = createSectionsGet({
      listRows: async () => {
        throw new Error("boom");
      },
      findRowById: async () => null,
    });
    const res = await GET(new Request("http://localhost:3000/api/sections"));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toEqual({ error: "sections_unavailable" });
  });
});

describe("GET /api/sections/[id]", () => {
  it("returns 200 with safe detail + similar sections", async () => {
    const GET = createSectionDetailGet(provider([
      row("sec-1"),
      row("sec-2", { sectionType: "hero" }),
    ]));
    const res = await GET(
      new Request("http://localhost:3000/api/sections/sec-1"),
      { params: Promise.resolve({ id: "sec-1" }) },
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe("sec-1");
    expect(body.lessons[0].code).toBe("CLARITY");
    expect(body.similarSections.map((s: { id: string }) => s.id)).toEqual(["sec-2"]);
    expect("claimantContact" in body).toBe(false);
    expect("contentBlob" in body).toBe(false);
  });

  it("returns 404 for hidden or unknown sections", async () => {
    const GET = createSectionDetailGet(provider([row("sec-hidden", { status: "ARCHIVED" })]));
    const res = await GET(
      new Request("http://localhost:3000/api/sections/sec-hidden"),
      { params: Promise.resolve({ id: "sec-hidden" }) },
    );
    expect(res.status).toBe(404);

    const missing = await GET(
      new Request("http://localhost:3000/api/sections/nope"),
      { params: Promise.resolve({ id: "nope" }) },
    );
    expect(missing.status).toBe(404);
  });

  it("returns an opaque 500 on provider failure", async () => {
    const GET = createSectionDetailGet({
      listRows: async () => [],
      findRowById: async () => {
        throw new Error("boom");
      },
    });
    const res = await GET(
      new Request("http://localhost:3000/api/sections/sec-1"),
      { params: Promise.resolve({ id: "sec-1" }) },
    );
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toEqual({ error: "section_unavailable" });
  });
});
