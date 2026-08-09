// POST /api/gallery/items/[id]/claims + /removal-request route tests
// (plan portfolio-detail-page T8). Turnstile + rate-limit protected, opaque
// safe responses, never echoes claimantContact/requestedBy/private state.

import { describe, it, expect } from "vitest";

import { createClaimPost } from "@/app/api/gallery/items/[id]/claims/route";
import { createRemovalPost } from "@/app/api/gallery/items/[id]/removal-request/route";

const MOCK_TOKEN = "mock-turnstile-token";
const PUBLIC_IP = "203.0.113.10";

function claimRequest(body: unknown, token = MOCK_TOKEN, ip = PUBLIC_IP): Request {
  return new Request("http://localhost:3000/api/gallery/items/item-123/claims", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-turnstile-token": token,
      "x-forwarded-for": ip,
    },
    body: JSON.stringify(body),
  });
}

function removalRequest(body: unknown, token = MOCK_TOKEN, ip = PUBLIC_IP): Request {
  return new Request("http://localhost:3000/api/gallery/items/item-123/removal-request", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-turnstile-token": token,
      "x-forwarded-for": ip,
    },
    body: JSON.stringify(body),
  });
}

const claimContext = { params: Promise.resolve({ id: "item-123" }) };
const removalContext = { params: Promise.resolve({ id: "item-123" }) };

const allowAll = { allow: () => true };
const denyAfter = (n: number) => {
  let count = 0;
  return { allow: () => ++count <= n };
};

describe("POST /claims", () => {
  it("returns 202 with only public fields for a valid protected claim", async () => {
    const POST = createClaimPost(
      async () => ({ id: "claim-1", status: "PENDING" }),
      async () => true,
      allowAll,
    );
    const res = await POST(
      claimRequest({
        itemId: "item-123",
        claimantName: "Test Owner",
        claimantContact: "owner@example.com",
      }),
      claimContext,
    );
    expect(res.status).toBe(202);
    const body = await res.json();
    expect(body).toEqual({ id: "claim-1", status: "PENDING" });
    expect("claimantContact" in body).toBe(false);
    expect("claimantName" in body).toBe(false);
  });

  it("returns 403 when Turnstile token is missing", async () => {
    const POST = createClaimPost(
      async () => {
        throw new Error("must not be called");
      },
      async () => true,
      allowAll,
    );
    const res = await POST(claimRequest({ itemId: "item-123", claimantName: "X", claimantContact: "e@x.com" }, ""), claimContext);
    expect(res.status).toBe(403);
  });

  it("returns 403 when Turnstile verification fails", async () => {
    const POST = createClaimPost(
      async () => {
        throw new Error("must not be called");
      },
      async () => false,
      allowAll,
    );
    const res = await POST(claimRequest({ itemId: "item-123", claimantName: "X", claimantContact: "e@x.com" }), claimContext);
    expect(res.status).toBe(403);
  });

  it("returns 429 when rate-limited", async () => {
    const POST = createClaimPost(
      async () => {
        throw new Error("must not be called");
      },
      async () => true,
      denyAfter(0),
    );
    const res = await POST(claimRequest({ itemId: "item-123", claimantName: "X", claimantContact: "e@x.com" }), claimContext);
    expect(res.status).toBe(429);
  });

  it("returns 400 for schema-invalid or mismatched item bodies", async () => {
    const POST = createClaimPost(async () => {
      throw new Error("must not be called");
    }, async () => true, allowAll);

    const missingFields = await POST(claimRequest({ itemId: "item-123" }), claimContext);
    expect(missingFields.status).toBe(400);

    const mismatch = await POST(
      claimRequest({ itemId: "other-item", claimantName: "X", claimantContact: "e@x.com" }),
      { params: Promise.resolve({ id: "item-123" }) },
    );
    expect(mismatch.status).toBe(400);
  });

  it("returns an opaque 500 on service failure", async () => {
    const POST = createClaimPost(
      async () => {
        throw new Error("internal");
      },
      async () => true,
      allowAll,
    );
    const res = await POST(claimRequest({ itemId: "item-123", claimantName: "X", claimantContact: "e@x.com" }), claimContext);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toEqual({ error: "claim_unavailable" });
    expect(JSON.stringify(body)).not.toContain("internal");
  });
});

describe("POST /removal-request", () => {
  it("returns 202 with only public fields for a valid protected removal", async () => {
    const POST = createRemovalPost(
      async () => ({ id: "removal-1", status: "REQUESTED" }),
      async () => true,
      allowAll,
    );
    const res = await POST(
      removalRequest({ itemId: "item-123", requestedBy: "Owner", reason: "Please remove my work" }),
      removalContext,
    );
    expect(res.status).toBe(202);
    const body = await res.json();
    expect(body).toEqual({ id: "removal-1", status: "REQUESTED" });
    expect("requestedBy" in body).toBe(false);
    expect("reason" in body).toBe(false);
  });

  it("returns 403 without a valid token", async () => {
    const POST = createRemovalPost(
      async () => {
        throw new Error("must not be called");
      },
      async () => false,
      allowAll,
    );
    const res = await POST(removalRequest({ itemId: "item-123", requestedBy: "X", reason: "r" }), removalContext);
    expect(res.status).toBe(403);
  });

  it("returns 429 when rate-limited", async () => {
    const POST = createRemovalPost(
      async () => {
        throw new Error("must not be called");
      },
      async () => true,
      denyAfter(0),
    );
    const res = await POST(removalRequest({ itemId: "item-123", requestedBy: "X", reason: "r" }), removalContext);
    expect(res.status).toBe(429);
  });

  it("returns 400 for an empty reason or mismatched item", async () => {
    const POST = createRemovalPost(async () => {
      throw new Error("must not be called");
    }, async () => true, allowAll);

    const emptyReason = await POST(removalRequest({ itemId: "item-123", requestedBy: "X", reason: "" }), removalContext);
    expect(emptyReason.status).toBe(400);

    const mismatch = await POST(
      removalRequest({ itemId: "other", requestedBy: "X", reason: "r" }),
      { params: Promise.resolve({ id: "item-123" }) },
    );
    expect(mismatch.status).toBe(400);
  });
});
