/**
 * Site footer (plan T16).
 *
 * Minimal by design: product wordmark, one-line mission (from the charter),
 * a subtle link to the design-system reference page, and a copyright line.
 * NO fake social links and NO newsletter duplication (the newsletter form
 * lives in its own section). Server component — no state.
 */
export function Footer() {
  return (
    <footer
      data-testid="footer"
      className="border-t border-border"
      aria-label="Site footer"
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-col gap-2">
            <p className="font-mono text-sm font-medium text-foreground">
              FolioMuse
            </p>
            <p className="max-w-[55ch] text-sm leading-relaxed text-muted-foreground">
              Build a portfolio that is genuinely your own, informed by real
              examples, sharpened by AI feedback, and assembled with an agent.
            </p>
          </div>
          <a
            href="/design"
            className="text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
          >
            Design system
          </a>
        </div>
        <p className="text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} FolioMuse. Inspiration, not
          cloning.
        </p>
      </div>
    </footer>
  );
}
