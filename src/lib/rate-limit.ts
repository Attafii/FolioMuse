// In-memory rate limiter for API routes.
// ponytail: simple, no Redis dependency. Resets on server restart.

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt < now) {
      store.delete(key);
    }
  }
}, 5 * 60 * 1000);

export interface RateLimitConfig {
  /** Max requests per window */
  limit: number;
  /** Window duration in milliseconds */
  windowMs: number;
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Check rate limit for a given key (usually IP or user ID).
 *
 * @param key - Unique identifier for the rate limit bucket
 * @param config - Rate limit configuration
 * @returns Rate limit result with success, remaining, and resetAt
 */
export function checkRateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt < now) {
    // New window
    const resetAt = now + config.windowMs;
    store.set(key, { count: 1, resetAt });
    return { success: true, remaining: config.limit - 1, resetAt };
  }

  if (entry.count >= config.limit) {
    // Rate limited
    return { success: false, remaining: 0, resetAt: entry.resetAt };
  }

  // Increment
  entry.count++;
  return { success: true, remaining: config.limit - entry.count, resetAt: entry.resetAt };
}

/**
 * Get client IP from request headers.
 * Works with Vercel, Cloudflare, and standard proxies.
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }
  return "unknown";
}

/** Default rate limit configs */
export const RATE_LIMITS = {
  /** Chat API: 20 requests per minute */
  chat: { limit: 20, windowMs: 60 * 1000 },
  /** MCP API: 30 requests per minute */
  mcp: { limit: 30, windowMs: 60 * 1000 },
  /** Newsletter: 5 requests per hour */
  newsletter: { limit: 5, windowMs: 60 * 60 * 1000 },
  /** General API: 100 requests per minute */
  general: { limit: 100, windowMs: 60 * 1000 },
} as const;
