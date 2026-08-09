// ─── POST /api/gallery/items/[id]/removal-request ──────────────────────────
// Public removal/report intake (plan portfolio-detail-page T8, ADR-0007 D5).
// Turnstile + rate-limit protected; validates with RequestRemovalInputSchema;
// delegates to ProvenanceService.requestRemoval; returns only public id/status.
// "Request removal" is the user-facing report path - no generic Report model.

import { RequestRemovalInputSchema } from "@/domain/provenance/schemas";
import { ProvenanceService } from "@/domain/provenance/provenance-service";
import { ProvenanceRepositoryPrisma } from "@/persistence/provenance-repository-prisma";
import type { ProvenanceRebuildQueue } from "@/domain/provenance/ports";
import {
  createCloudflareTurnstileVerifier,
  createSubmissionRateLimiter,
  type RateLimiter,
  type TurnstileVerifier,
} from "@/lib/anti-abuse";
import { enforceProtectedPost } from "@/app/api/gallery/items/[id]/_shared";

export type RemovalSubmitter = (input: {
  itemId: string;
  requestedBy: string;
  reason: string;
}) => Promise<{ id: string; status: string }>;

export function createRemovalPost(
  submitRemoval: RemovalSubmitter,
  verifyToken: TurnstileVerifier,
  rateLimit: RateLimiter,
) {
  return async function POST(
    request: Request,
    context: { params: Promise<{ id: string }> },
  ): Promise<Response> {
    const { id } = await context.params;
    const blocked = await enforceProtectedPost(request, { verifyToken, rateLimit });
    if (blocked) return blocked;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "invalid_json" }, { status: 400 });
    }

    const parsed = RequestRemovalInputSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: "validation_failed" }, { status: 400 });
    }
    if (parsed.data.itemId !== id) {
      return Response.json({ error: "item_mismatch" }, { status: 400 });
    }

    try {
      const removal = await submitRemoval({
        itemId: parsed.data.itemId,
        requestedBy: parsed.data.requestedBy,
        reason: parsed.data.reason,
      });
      // Public-only response: never echo requestedBy/reason/internal state.
      return Response.json({ id: removal.id, status: removal.status }, { status: 202 });
    } catch {
      return Response.json({ error: "removal_unavailable" }, { status: 500 });
    }
  };
}

// ─── Production composition (module singletons, mirrors /api/events) ────────
// Turnstile + rate limit come from the shared anti-abuse factories. The rate
// limiter MUST be a deployment-backed binding before production (ADR-0007 D5).

const provenanceRepo = new ProvenanceRepositoryPrisma();
const rebuildQueue: ProvenanceRebuildQueue = { enqueueRebuild: async () => {} };
const provenanceService = new ProvenanceService(
  provenanceRepo,
  rebuildQueue,
  { now: () => new Date().toISOString() },
  { emit: () => {} },
);

export const POST = createRemovalPost(
  (input) => provenanceService.requestRemoval(input),
  createCloudflareTurnstileVerifier(),
  createSubmissionRateLimiter(),
);
