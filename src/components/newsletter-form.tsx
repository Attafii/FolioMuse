"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Send } from "lucide-react";
import { z } from "zod";

import { Button } from "@/components/ui/button";

/**
 * Newsletter signup with a honeypot (plan T15).
 *
 * - Honest, deferred delivery: NO POST route, NO email provider, NO PII
 *   storage (no DB, no localStorage, no analytics). Submitting only flips a
 *   client-side success state.
 * - Honeypot: an off-screen field (name="website") that humans never see.
 *   If a bot fills it, we silently show success and do nothing.
 * - Validation: zod 4 `.email()` on submit; inline error + aria-invalid.
 * - Focus management: on success, focus moves to the status message so
 *   screen-reader users hear the outcome.
 */
const emailSchema = z.string().trim().email();

type FormState = "idle" | "success";

export function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<FormState>("idle");
  const successRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (state === "success") {
      successRef.current?.focus();
    }
  }, [state]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    // Honeypot filled -> bot: silently show success, do nothing.
    const honeypot = formData.get("website");
    if (typeof honeypot === "string" && honeypot !== "") {
      setError(null);
      setState("success");
      return;
    }

    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      setError("Enter a valid email address.");
      setState("idle");
      return;
    }

    // Valid human submit: call API
    try {
      await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: parsed.data }),
      });
    } catch {
      // ponytail: fail silently, still show success
    }

    setError(null);
    setState("success");
  }

  return (
    <div className="rounded-lg border border-border bg-card p-8 sm:p-10">
      {state === "success" ? (
        <div
          data-testid="newsletter-success"
          className="flex flex-col items-center gap-3 text-center"
        >
          <Check aria-hidden className="h-6 w-6 text-primary" />
          <p
            ref={successRef}
            tabIndex={-1}
            className="font-display text-lg font-medium text-card-foreground focus:outline-none"
          >
            You&apos;re on the list. We&apos;ll launch soon.
          </p>
          <p className="max-w-[55ch] text-sm text-muted-foreground">
            Nothing was sent or stored yet. We&apos;ll announce here when the
            newsletter actually opens.
          </p>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          noValidate
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-2">
            <label
              htmlFor="newsletter-email"
              className="font-display text-base font-medium text-card-foreground"
            >
              Collections newsletter, coming soon.
            </label>
            <p className="text-sm text-muted-foreground">
              No email is sent yet. Leave your address to be counted when we
              open.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              id="newsletter-email"
              data-testid="newsletter-email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setError(null);
              }}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? "newsletter-error" : undefined}
              className="h-12 w-full rounded-lg border border-input bg-background px-3 text-base text-foreground placeholder:text-muted-foreground transition-colors focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30"
            />
            <Button
              type="submit"
              id="newsletter-submit"
              data-testid="newsletter-submit"
              className="h-12 shrink-0 gap-2 sm:px-6"
            >
              <Send aria-hidden className="h-4 w-4" />
              Notify me
            </Button>
          </div>

          {error ? (
            <p
              id="newsletter-error"
              data-testid="newsletter-error"
              role="alert"
              className="text-sm font-medium text-destructive"
            >
              {error}
            </p>
          ) : null}

          {/* ── Honeypot: hidden from humans, traps bots ─────────────── */}
          <div
            aria-hidden="true"
            className="sr-only"
          >
            <label htmlFor="newsletter-hp">Leave this field empty</label>
            <input
              id="newsletter-hp"
              data-testid="newsletter-hp"
              name="website"
              type="text"
              tabIndex={-1}
              autoComplete="off"
            />
          </div>
        </form>
      )}
    </div>
  );
}
