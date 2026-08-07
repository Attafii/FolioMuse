import Link from "next/link";

import { ThemeToggle } from "@/components/theme-toggle";

/**
 * Slim site masthead (plan T8). Wordmark + theme toggle only — no fake nav,
 * no login buttons. Server component; the theme toggle is the sole client
 * boundary (existing component). Height capped at 64-72px per Taste skill.
 */
export function Masthead() {
  return (
    <header className="sticky top-0 z-[var(--z-sticky)] border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="font-display text-lg font-semibold tracking-tight text-foreground"
        >
          FolioMuse
        </Link>
        <ThemeToggle />
      </div>
    </header>
  );
}
