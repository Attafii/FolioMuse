"use client";

import { Button } from "@/components/ui/button";
import { RefreshCw, Home } from "lucide-react";
import { useEffect } from "react";

/**
 * Root error boundary for FolioMuse.
 *
 * Catches unhandled errors across the entire app.
 * Matches the editorial technical-index aesthetic.
 * Never surfaces stack traces or private data to users.
 * Keyboard-accessible with visible focus states.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to telemetry in production
    if (process.env.NODE_ENV === "production") {
      console.error("[GlobalError]", error.digest ?? error.message);
    }
  }, [error]);

  return (
    <main
      role="alert"
      aria-live="assertive"
      className="flex min-h-[70vh] flex-col items-center justify-center px-4"
    >
      <div className="mx-auto flex max-w-lg flex-col items-center text-center">
        {/* Status indicator */}
        <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10">
          <span className="text-2xl" aria-hidden="true">
            !
          </span>
        </div>

        {/* Headline */}
        <h1 className="mt-6 font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Something went wrong
        </h1>

        {/* Description */}
        <p className="mt-4 max-w-[50ch] text-base leading-relaxed text-muted-foreground">
          An unexpected error occurred. This has been logged and we&apos;re
          looking into it. You can try again or head back home.
        </p>

        {/* Actions */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button onClick={reset}>
            <RefreshCw className="mr-2 size-4" />
            Try again
          </Button>
          <Button variant="outline" render={<a href="/" />}>
            <Home className="mr-2 size-4" />
            Go home
          </Button>
        </div>

        {/* Decorative divider */}
        <div className="mt-12 h-px w-24 bg-border" />

        {/* Error ID for support */}
        {error.digest && (
          <p className="mt-4 font-mono text-xs text-muted-foreground">
            Error ID: {error.digest}
          </p>
        )}
      </div>
    </main>
  );
}
