import { Button } from "@/components/ui/button";
import { Home, Search, ArrowLeft } from "lucide-react";

/**
 * Root 404 page for FolioMuse.
 *
 * Matches the editorial technical-index aesthetic:
 * - Cobalt accent, warm neutrals, Geist typography
 * - Minimal, purposeful layout with generous whitespace
 * - Keyboard-accessible with visible focus states
 */
export default function NotFound() {
  return (
    <main className="flex min-h-[70vh] flex-col items-center justify-center px-4">
      <div className="mx-auto flex max-w-lg flex-col items-center text-center">
        {/* Status code */}
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-cobalt-500">
          404
        </p>

        {/* Headline */}
        <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Page not found
        </h1>

        {/* Description */}
        <p className="mt-4 max-w-[50ch] text-base leading-relaxed text-muted-foreground">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
          Try searching for what you need, or head back home.
        </p>

        {/* Actions */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button render={<a href="/" />}>
            <Home className="mr-2 size-4" />
            Go home
          </Button>
          <Button variant="outline" render={<a href="/browse" />}>
            <Search className="mr-2 size-4" />
            Browse gallery
          </Button>
          <Button variant="ghost" render={<a href="/" />}>
            <ArrowLeft className="mr-2 size-4" />
            Go back
          </Button>
        </div>

        {/* Decorative divider */}
        <div className="mt-12 h-px w-24 bg-border" />

        {/* Help text */}
        <p className="mt-6 text-sm text-muted-foreground">
          If you think this is a mistake,{" "}
          <a
            href="https://github.com/Attafii/FolioMuse/issues"
            target="_blank"
            rel="noopener noreferrer"
            className="text-cobalt-500 underline underline-offset-4 hover:text-cobalt-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            let us know
          </a>
          .
        </p>
      </div>
    </main>
  );
}
