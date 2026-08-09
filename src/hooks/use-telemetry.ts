"use client";

import { useCallback, useMemo } from "react";

import type { FlywheelEventPayload } from "@/domain/flywheel/types";

/**
 * Homepage flywheel telemetry (plan T17).
 *
 * Maps the plan's placeholder interaction events onto the CLOSED flywheel
 * vocabulary (ADR-0004 D1 — read schemas.ts before coding, do not guess):
 * - search_submit  → IMPRESSION per surfaced result on submit/Enter
 * - search result open → OPEN on result open (Enter on highlighted / click)
 * - section_visible → IMPRESSION per item, once per section (deterministic
 *   idempotencyKey = exactly-once, matching the plan's "fire on first render")
 *
 * Privacy: NO page-view events (raw views are NON-metrics, ADR-0004 D8).
 * Subject is a SHA-256 hex digest of a session-scoped anonymous UUID — no raw
 * identifier ever leaves the browser. Payloads carry a `source` label and the
 * (optional) query string — a pattern signal explicitly allowed by the plan;
 * NEVER emails, creator names, consent data, or content blobs.
 *
 * Fire-and-forget: fetch keepalive, wrapped in try/catch. Telemetry never
 * blocks rendering, never throws, never surfaces errors to the UI.
 */

// ─── Session-scoped anonymous subject key (ADR-0004 D1) ───────────────────
// One SHA-256 digest per page session, cached across all emits.

let subjectKeyPromise: Promise<string> | null = null;

function randomHex(bytes: number): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return Array.from(buf)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function getSubjectKey(): Promise<string> {
  if (!subjectKeyPromise) {
    subjectKeyPromise = (async () => {
      // Stable anonymous id for the session (UUID v4), hashed to 64 hex.
      const anonId = crypto.randomUUID();
      try {
        const digest = await crypto.subtle.digest(
          "SHA-256",
          new TextEncoder().encode(anonId),
        );
        return Array.from(new Uint8Array(digest))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");
      } catch {
        // Non-secure context (no crypto.subtle): random 64-hex token is
        // still non-identifying and satisfies the SubjectKeySchema regex.
        return randomHex(32);
      }
    })();
  }
  return subjectKeyPromise;
}

// ─── Fire-and-forget POST ─────────────────────────────────────────────────

function postEvent(body: Record<string, unknown>): void {
  void (async () => {
    try {
      await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        // keepalive: survives page unload; never blocks the UI thread.
        keepalive: true,
      });
    } catch {
      // Telemetry must NEVER break the page (plan T17 Must NOT).
    }
  })();
}

// ─── Public surface ────────────────────────────────────────────────────────

export interface Telemetry {
  /**
   * IMPRESSION for a surfaced/visible gallery item.
   * Pass an explicit idempotencyKey for exactly-once semantics (section
   * visibility); omit it for per-interaction events (search submit).
   */
  impression: (
    itemId: string,
    payload?: FlywheelEventPayload,
    idempotencyKey?: string,
  ) => void;
  /** OPEN when a gallery item is opened (result open / card click). */
  open: (itemId: string, payload?: FlywheelEventPayload) => void;
  /**
   * SAVE when a builder bookmarks a gallery item (plan portfolio-card-system
   * T8, ADR-0004 D1/D2: SAVE = 3, a strong action signal). Fired ONLY on
   * bookmark-add; removal and preview toggles are local UI state because the
   * closed flywheel vocabulary has no UNSAVE/PREVIEW event.
   */
  save: (itemId: string, payload?: FlywheelEventPayload) => void;
}

export function useTelemetry(): Telemetry {
  const impression = useCallback(
    (itemId: string, payload?: FlywheelEventPayload, idempotencyKey?: string) => {
      void getSubjectKey().then((subjectKey) =>
        postEvent({
          eventType: "IMPRESSION",
          subjectKey,
          itemId,
          occurredAt: new Date().toISOString(),
          idempotencyKey:
            idempotencyKey ?? `impression:${itemId}:${crypto.randomUUID()}`,
          payload,
        }),
      );
    },
    [],
  );

  const open = useCallback(
    (itemId: string, payload?: FlywheelEventPayload) => {
      void getSubjectKey().then((subjectKey) =>
        postEvent({
          eventType: "OPEN",
          subjectKey,
          itemId,
          occurredAt: new Date().toISOString(),
          idempotencyKey: `open:${itemId}:${crypto.randomUUID()}`,
          payload,
        }),
      );
    },
    [],
  );

  const save = useCallback(
    (itemId: string, payload?: FlywheelEventPayload) => {
      void getSubjectKey().then((subjectKey) =>
        postEvent({
          eventType: "SAVE",
          subjectKey,
          itemId,
          occurredAt: new Date().toISOString(),
          idempotencyKey: `save:${itemId}:${crypto.randomUUID()}`,
          payload,
        }),
      );
    },
    [],
  );

  return useMemo(() => ({ impression, open, save }), [impression, open, save]);
}

/**
 * Deterministic idempotency key for section visibility (exactly-once per
 * item per section): the ingestor dedupes on it (ADR-0004 D1), so StrictMode
 * double-mounts / re-renders never double-record.
 */
export function sectionVisibilityKey(source: string, itemId: string): string {
  return `section_visible:${source}:${itemId}`;
}
