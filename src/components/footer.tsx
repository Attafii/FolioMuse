import { Shuffle } from "lucide-react";
import Link from "next/link";

/**
 * Site footer — redesigned with modern layout.
 *
 * Organized into columns: product, explore, resources, connect.
 * Includes a mini newsletter CTA and social proof.
 * Server component — no state.
 */

const footerLinks = {
  product: [
    { label: "Gallery", href: "/browse" },
    { label: "Random portfolio", href: "/random" },
    { label: "Liked", href: "/liked" },
    { label: "Design system", href: "/design" },
  ],
  explore: [
    { label: "By role", href: "/browse" },
    { label: "By style", href: "/browse" },
    { label: "Editorial collections", href: "/browse" },
    { label: "New & notable", href: "/browse" },
  ],
  resources: [
    { label: "Documentation", href: "/docs" },
    { label: "How it works", href: "/docs#how-it-works" },
    { label: "MCP agent", href: "/docs#mcp-agent" },
    { label: "Originality rules", href: "/docs#originality" },
    { label: "API reference", href: "/docs#api" },
  ],
};

export function Footer() {
  return (
    <footer
      data-testid="footer"
      className="border-t border-border"
      aria-label="Site footer"
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-12 sm:px-6 lg:px-8">
        {/* Top section: brand + links */}
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4 lg:grid-cols-5">
          {/* Brand column */}
          <div className="col-span-2 flex flex-col gap-4 sm:col-span-4 lg:col-span-2">
            <div className="flex flex-col gap-2">
              <p className="font-display text-lg font-semibold text-foreground">
                FolioMuse
              </p>
              <p className="max-w-[40ch] text-sm leading-relaxed text-muted-foreground">
                Build a portfolio that is genuinely your own, informed by real
                examples, sharpened by AI feedback, and assembled with an agent.
              </p>
            </div>
            <Link
              href="/random"
              className="group inline-flex w-fit items-center gap-2 rounded-full border border-border/60 bg-card/50 px-4 py-2 font-mono text-xs tracking-wide text-muted-foreground backdrop-blur-sm transition-all hover:bg-muted hover:text-foreground"
            >
              <Shuffle className="h-3.5 w-3.5" />
              Discover a random portfolio
            </Link>
          </div>

          {/* Link columns */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category} className="flex flex-col gap-3">
              <p className="font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground">
                {category}
              </p>
              <ul className="flex flex-col gap-2">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div className="h-px w-full bg-border" />

        {/* Bottom section: copyright + meta */}
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} FolioMuse. Inspiration, not
            cloning.
          </p>
          <div className="flex items-center gap-4">
            <span className="font-mono text-xs text-muted-foreground">
              Built with Next.js + Prisma
            </span>
            <span className="text-border" aria-hidden>·</span>
            <span className="font-mono text-xs text-muted-foreground">
              v0.1.0
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
