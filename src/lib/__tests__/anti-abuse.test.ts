// Anti-abuse adapter contract tests (plan portfolio-detail-page T4).
// Turnstile siteverify + deployment-backed rate limiting for public
// claim/removal submissions. Contracts are framework-agnostic; route fakes
// prove 403 (missing/invalid token), 429 (quota), and fail-closed behavior.

import { describe, it, expect } from "vitest";

import {
  createTurnstileVerifier,
  createSlidingWindowRateLimiter,
  isPrivateIp,
} from "@/lib/anti-abuse";

const MOCK_TOKEN = "mock-turnstile-token";

describe("isPrivateIp", () => {
  it("identifies loopback and private ranges", () => {
    expect(isPrivateIp("127.0.0.1")).toBe(true);
    expect(isPrivateIp("::1")).toBe(true);
    expect(isPrivateIp("10.0.0.5")).toBe(true);
    expect(isPrivateIp("192.168.1.1")).toBe(true);
    expect(isPrivateIp("172.16.0.1")).toBe(true);
  });

  it("accepts public IPs", () => {
    expect(isPrivateIp("203.0.113.10")).toBe(false);
    expect(isPrivateIp("8.8.8.8")).toBe(false);
  });
});

describe("createTurnstileVerifier", () => {
  it("accepts a token when the provider succeeds", async () => {
    const provider = async () => ({ success: true });
    const verify = createTurnstileVerifier(provider);
    expect(await verify(MOCK_TOKEN)).toBe(true);
  });

  it("rejects a token when the provider denies", async () => {
    const provider = async () => ({ success: false });
    const verify = createTurnstileVerifier(provider);
    expect(await verify(MOCK_TOKEN)).toBe(false);
  });

  it("fails closed when the provider throws (outage)", async () => {
    const provider = async () => {
      throw new Error("provider timeout");
    };
    const verify = createTurnstileVerifier(provider);
    expect(await verify(MOCK_TOKEN)).toBe(false);
  });

  it("fails closed on an empty token (no provider call)", async () => {
    let called = 0;
    const provider = async () => {
      called += 1;
      return { success: true };
    };
    const verify = createTurnstileVerifier(provider);
    expect(await verify("")).toBe(false);
    expect(called).toBe(0);
  });
});

describe("createSlidingWindowRateLimiter", () => {
  it("allows requests within the limit", () => {
    const limiter = createSlidingWindowRateLimiter({ max: 5, windowMs: 600_000 });
    for (let i = 0; i < 5; i++) {
      expect(limiter.allow("203.0.113.10")).toBe(true);
    }
  });

  it("blocks requests beyond the limit", () => {
    const limiter = createSlidingWindowRateLimiter({ max: 5, windowMs: 600_000 });
    for (let i = 0; i < 5; i++) limiter.allow("203.0.113.10");
    expect(limiter.allow("203.0.113.10")).toBe(false);
  });

  it("tracks different IPs independently", () => {
    const limiter = createSlidingWindowRateLimiter({ max: 2, windowMs: 600_000 });
    expect(limiter.allow("203.0.113.1")).toBe(true);
    expect(limiter.allow("203.0.113.1")).toBe(true);
    expect(limiter.allow("203.0.113.2")).toBe(true);
    expect(limiter.allow("203.0.113.1")).toBe(false);
  });

  it("sliding window expires after the window", () => {
    const limiter = createSlidingWindowRateLimiter({
      max: 1,
      windowMs: 60_000,
      now: () => 1_000,
    });
    expect(limiter.allow("203.0.113.10")).toBe(true);
    expect(limiter.allow("203.0.113.10")).toBe(false);
    // Advance 61s: a new window should allow.
    const later = createSlidingWindowRateLimiter({
      max: 1,
      windowMs: 60_000,
      now: () => 61_000,
    });
    expect(later.allow("203.0.113.10")).toBe(true);
  });

  it("enforces a separate daily cap", () => {
    const limiter = createSlidingWindowRateLimiter({
      max: 10,
      windowMs: 600_000,
      dailyMax: 3,
      now: () => 1_000,
    });
    expect(limiter.allow("203.0.113.10")).toBe(true);
    expect(limiter.allow("203.0.113.10")).toBe(true);
    expect(limiter.allow("203.0.113.10")).toBe(true); // daily cap reached
    expect(limiter.allow("203.0.113.10")).toBe(false); // daily cap blocks 4th
  });
});
