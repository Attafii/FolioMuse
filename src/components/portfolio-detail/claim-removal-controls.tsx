"use client";

import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";

/**
 * Owner claim + removal request controls for /gallery/[id] (plan T11).
 *
 * - Public, Turnstile-protected intake (ADR-0007 D5). The Turnstile token is
 *   sent via the x-turnstile-token header; the widget response is read from
 *   window.__TURNSTILE__ when a site key is configured, otherwise empty
 *   (dev). The server fails closed (403) without a valid token.
 * - Bounded inputs validated client-side; generic status messages; never
 *   displays claimantContact/requestedBy back to the user.
 * - "Request removal" is the report path (existing RemovalRecord workflow).
 */

const STATUS_GENERIC = {
  accepted: "Thanks. Your request has been submitted for review.",
  error: "Your request could not be submitted. Please try again.",
  blocked: "This request could not be verified. Please try again.",
  limited: "Too many requests. Please try again later.",
};

function getTurnstileToken(): string {
  try {
    const state = (window as unknown as { __TURNSTILE__?: { response?: string } })
      .__TURNSTILE__;
    return state?.response ?? "";
  } catch {
    return "";
  }
}

type FormStatus = { kind: "idle" } | { kind: "success" } | { kind: "error"; message: string };

export function OwnerClaimForm({ itemId }: { itemId: string }) {
  const [status, setStatus] = useState<FormStatus>({ kind: "idle" });
  const statusRef = useRef<HTMLParagraphElement>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const body = {
      itemId,
      claimantName: String(formData.get("claimantName") ?? ""),
      claimantContact: String(formData.get("claimantContact") ?? ""),
    };
    const token = getTurnstileToken();
    try {
      const res = await fetch(`/api/gallery/items/${itemId}/claims`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-turnstile-token": token,
        },
        body: JSON.stringify(body),
      });
      if (res.status === 202) {
        setStatus({ kind: "success" });
      } else if (res.status === 403) {
        setStatus({ kind: "error", message: STATUS_GENERIC.blocked });
      } else if (res.status === 429) {
        setStatus({ kind: "error", message: STATUS_GENERIC.limited });
      } else {
        setStatus({ kind: "error", message: STATUS_GENERIC.error });
      }
      form.reset();
    } catch {
      setStatus({ kind: "error", message: STATUS_GENERIC.error });
    }
    statusRef.current?.focus();
  }

  return (
    <form data-testid="owner-claim-form" onSubmit={handleSubmit} className="flex flex-col gap-3" noValidate>
      <h3 className="font-display text-base font-semibold tracking-tight">Own this portfolio?</h3>
      <div className="flex flex-col gap-1">
        <label htmlFor={`claim-name-${itemId}`} className="text-sm text-foreground">
          Your name
        </label>
        <input
          id={`claim-name-${itemId}`}
          name="claimantName"
          required
          maxLength={200}
          aria-required="true"
          className="h-9 rounded-md border border-input bg-card px-3 text-sm text-foreground focus:border-ring focus:ring-2 focus:ring-ring/30 focus:outline-none"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor={`claim-contact-${itemId}`} className="text-sm text-foreground">
          Contact email or handle
        </label>
        <input
          id={`claim-contact-${itemId}`}
          name="claimantContact"
          type="text"
          required
          maxLength={500}
          aria-required="true"
          className="h-9 rounded-md border border-input bg-card px-3 text-sm text-foreground focus:border-ring focus:ring-2 focus:ring-ring/30 focus:outline-none"
        />
      </div>
      {/* Honeypot: bots fill this hidden field; never rendered visibly. */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
      {status.kind === "success" ? (
        <p ref={statusRef} role="status" data-testid="claim-status" className="text-sm text-success-foreground">
          {STATUS_GENERIC.accepted}
        </p>
      ) : null}
      {status.kind === "error" ? (
        <p ref={statusRef} role="alert" data-testid="claim-status" className="text-sm text-destructive-foreground">
          {status.message}
        </p>
      ) : null}
      <Button type="submit" variant="outline" size="sm" className="self-start">
        Submit owner claim
      </Button>
    </form>
  );
}

export function RemovalRequestForm({ itemId }: { itemId: string }) {
  const [status, setStatus] = useState<FormStatus>({ kind: "idle" });
  const statusRef = useRef<HTMLParagraphElement>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const body = {
      itemId,
      requestedBy: String(formData.get("requestedBy") ?? ""),
      reason: String(formData.get("reason") ?? ""),
    };
    const token = getTurnstileToken();
    try {
      const res = await fetch(`/api/gallery/items/${itemId}/removal-request`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-turnstile-token": token,
        },
        body: JSON.stringify(body),
      });
      if (res.status === 202) {
        setStatus({ kind: "success" });
      } else if (res.status === 403) {
        setStatus({ kind: "error", message: STATUS_GENERIC.blocked });
      } else if (res.status === 429) {
        setStatus({ kind: "error", message: STATUS_GENERIC.limited });
      } else {
        setStatus({ kind: "error", message: STATUS_GENERIC.error });
      }
      form.reset();
    } catch {
      setStatus({ kind: "error", message: STATUS_GENERIC.error });
    }
    statusRef.current?.focus();
  }

  return (
    <form data-testid="removal-request-form" onSubmit={handleSubmit} className="flex flex-col gap-3" noValidate>
      <h3 className="font-display text-base font-semibold tracking-tight">Request removal</h3>
      <div className="flex flex-col gap-1">
        <label htmlFor={`removal-by-${itemId}`} className="text-sm text-foreground">
          Your name or role
        </label>
        <input
          id={`removal-by-${itemId}`}
          name="requestedBy"
          required
          maxLength={200}
          aria-required="true"
          className="h-9 rounded-md border border-input bg-card px-3 text-sm text-foreground focus:border-ring focus:ring-2 focus:ring-ring/30 focus:outline-none"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor={`removal-reason-${itemId}`} className="text-sm text-foreground">
          Reason
        </label>
        <textarea
          id={`removal-reason-${itemId}`}
          name="reason"
          required
          maxLength={2000}
          rows={3}
          aria-required="true"
          className="rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground focus:border-ring focus:ring-2 focus:ring-ring/30 focus:outline-none"
        />
      </div>
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
      {status.kind === "success" ? (
        <p ref={statusRef} role="status" data-testid="removal-status" className="text-sm text-success-foreground">
          {STATUS_GENERIC.accepted}
        </p>
      ) : null}
      {status.kind === "error" ? (
        <p ref={statusRef} role="alert" data-testid="removal-status" className="text-sm text-destructive-foreground">
          {status.message}
        </p>
      ) : null}
      <Button type="submit" variant="outline" size="sm" className="self-start">
        Request removal
      </Button>
    </form>
  );
}

export function ClaimRemovalControls({ itemId }: { itemId: string }) {
  return (
    <section
      aria-labelledby="controls-heading"
      data-testid="claim-removal-controls"
      className="grid grid-cols-1 gap-8 border-t border-border pt-6 md:grid-cols-2"
    >
      <div>
        <h2 id="controls-heading" className="sr-only">
          Owner claim and removal
        </h2>
        <OwnerClaimForm itemId={itemId} />
      </div>
      <div>
        <RemovalRequestForm itemId={itemId} />
      </div>
    </section>
  );
}
