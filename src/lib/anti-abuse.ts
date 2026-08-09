// Anti-abuse contracts for public claim/removal submissions
// (plan portfolio-detail-page T4, ADR-0007 D5).
//
// - Turnstile siteverify is an injected async provider so routes can be
//   tested with fakes and the production binding is a thin Cloudflare call.
// - Rate limiting is a framework-agnostic sliding window per IP with an
//   optional daily cap. PRODUCTION MUST use a deployment-backed limiter
//   (e.g. edge/DB-backed), never a process-local-only limiter; this module
//   provides the contract and an in-memory fake for tests.
// - No tokens, IPs, or claimant data are ever logged.

export interface TurnstileVerifyResult {
  success: boolean;
}

export type TurnstileProvider = (token: string, remoteIp: string | null) => Promise<TurnstileVerifyResult>;

export type TurnstileVerifier = (token: string, remoteIp?: string | null) => Promise<boolean>;

/**
 * Create a Turnstile verifier. Fails closed: empty token or provider
 * exception => not verified (no provider call for empty token).
 */
export function createTurnstileVerifier(provider: TurnstileProvider): TurnstileVerifier {
  return async (token: string, remoteIp: string | null = null): Promise<boolean> => {
    if (!token) return false;
    try {
      const result = await provider(token, remoteIp);
      return result.success === true;
    } catch {
      return false;
    }
  };
}

/**
 * Production Cloudflare Turnstile siteverify binding. Reads
 * TURNSTILE_SECRET_KEY; fails closed when unset or on provider error.
 * Shared by the claim and removal-request routes (single definition).
 */
export function createCloudflareTurnstileVerifier(): TurnstileVerifier {
  return createTurnstileVerifier(async (token, remoteIp) => {
    if (!process.env.TURNSTILE_SECRET_KEY) return { success: false };
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        secret: process.env.TURNSTILE_SECRET_KEY,
        response: token,
        remoteip: remoteIp ?? undefined,
      }),
    });
    const data = (await res.json()) as { success?: boolean };
    return { success: data.success === true };
  });
}

/**
 * Default protected-submission policy (ADR-0007 D5): 5 per IP per 10 minutes
 * plus a 20/day cap. The returned limiter is the in-memory contract/fake -
 * production must bind a deployment-backed limiter before going live.
 */
export function createSubmissionRateLimiter(): RateLimiter {
  return createSlidingWindowRateLimiter({ max: 5, windowMs: 600_000, dailyMax: 20 });
}

export interface RateLimiterOptions {
  max: number; // submissions per window
  windowMs: number; // sliding window length
  dailyMax?: number; // optional daily cap
  now?: () => number; // injectable clock (ms epoch)
}

export interface RateLimiter {
  allow: (ip: string) => boolean;
}

/**
 * In-memory sliding-window limiter (test/local fake). Production routes must
 * be composed with a deployment-backed limiter; do not ship this as the
 * production limiter (ADR-0007 D5: no process-local-only fallback).
 */
export function createSlidingWindowRateLimiter(options: RateLimiterOptions): RateLimiter {
  const now = options.now ?? (() => Date.now());
  const windowHits = new Map<string, number[]>();
  const dailyHits = new Map<string, number[]>();
  const DAY_MS = 86_400_000;

  function pruneWindow(ip: string, current: number): number[] {
    const hits = (windowHits.get(ip) ?? []).filter((t) => current - t < options.windowMs);
    return hits;
  }

  return {
    allow(ip: string): boolean {
      const current = now();

      // Daily cap check first.
      if (options.dailyMax !== undefined) {
        const daily = (dailyHits.get(ip) ?? []).filter((t) => current - t < DAY_MS);
        if (daily.length >= options.dailyMax) return false;
      }

      const hits = pruneWindow(ip, current);
      if (hits.length >= options.max) {
        windowHits.set(ip, hits);
        return false;
      }

      hits.push(current);
      windowHits.set(ip, hits);
      const daily = dailyHits.get(ip) ?? [];
      daily.push(current);
      dailyHits.set(ip, daily);
      return true;
    },
  };
}

/** RFC1918 + loopback detection used by route fakes and abuse guards. */
export function isPrivateIp(ip: string): boolean {
  const normalized = ip.replace(/^\[|\]$/g, "").toLowerCase();
  if (normalized === "::1" || normalized === "127.0.0.1" || normalized === "0.0.0.0") return true;
  if (/^127\./.test(normalized)) return true;
  if (/^10\./.test(normalized)) return true;
  if (/^192\.168\./.test(normalized)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(normalized)) return true;
  return false;
}
