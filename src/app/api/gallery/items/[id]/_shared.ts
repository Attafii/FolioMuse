// Shared protected-POST guard for claim/removal routes (plan T8, ADR-0007 D5).
// Extracts the Turnstile token + client IP, runs siteverify then rate limit.
// Fail closed: missing token, provider failure, or quota exhaustion blocks.

import type { RateLimiter, TurnstileVerifier } from "@/lib/anti-abuse";

export interface ProtectedPostContext {
  verifyToken: TurnstileVerifier;
  rateLimit: RateLimiter;
}

export function getClientIp(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return request.headers.get("x-real-ip");
}

export function getTurnstileToken(request: Request): string {
  return request.headers.get("x-turnstile-token") ?? "";
}

/** Returns null when allowed, or an error Response when blocked. */
export async function enforceProtectedPost(
  request: Request,
  ctx: ProtectedPostContext,
): Promise<null | Response> {
  const token = getTurnstileToken(request);
  const ip = getClientIp(request) ?? "unknown";

  // Fail closed on an empty token before any provider call (defense in depth).
  if (!token) {
    return Response.json({ error: "verification_failed" }, { status: 403 });
  }

  const verified = await ctx.verifyToken(token, ip);
  if (!verified) {
    return Response.json({ error: "verification_failed" }, { status: 403 });
  }
  if (!ctx.rateLimit.allow(ip)) {
    return Response.json({ error: "rate_limited" }, { status: 429 });
  }
  return null;
}
