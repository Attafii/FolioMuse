import type { Metadata } from "next";

import { SectionHeader } from "@/components/section-header";

export const metadata: Metadata = {
  title: "MCP Server — FolioMuse",
  description:
    "Connect AI tools to FolioMuse via the Model Context Protocol (MCP).",
};

export default function McpPage() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-12 sm:px-6 lg:px-8">
      <SectionHeader
        id="mcp-heading"
        eyebrow="MCP Server"
        title="Connect AI tools"
        description="Use the Model Context Protocol to connect Claude, Cursor, and other AI tools to FolioMuse."
      />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Endpoint info */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="font-display text-lg font-semibold">Endpoint</h3>
          <div className="mt-4 space-y-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                URL
              </p>
              <code className="mt-1 block rounded bg-muted px-3 py-2 text-sm">
                https://foliomuse.com/api/mcp
              </code>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Protocol
              </p>
              <p className="mt-1 text-sm">MCP 2024-11-05</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Method
              </p>
              <p className="mt-1 text-sm">POST (JSON-RPC)</p>
            </div>
          </div>
        </div>

        {/* Available tools */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="font-display text-lg font-semibold">Available Tools</h3>
          <div className="mt-4 space-y-4">
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="font-mono text-sm font-medium">search_portfolios</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Search the gallery by query, role, or style
              </p>
            </div>
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="font-mono text-sm font-medium">get_portfolio</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Get details for a specific portfolio
              </p>
            </div>
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="font-mono text-sm font-medium">get_section_advice</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Get AI advice for improving a section
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Usage example */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="font-display text-lg font-semibold">Usage Example</h3>
        <pre className="mt-4 overflow-x-auto rounded-lg bg-muted p-4 text-sm">
{`// Initialize connection
const response = await fetch("/api/mcp", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    method: "tools/call",
    params: {
      name: "search_portfolios",
      arguments: { query: "Frontend Developer", limit: 5 }
    }
  })
});

const result = await response.json();
// result.content[0].text contains the JSON results`}
        </pre>
      </div>

      {/* Safe projection rules */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="font-display text-lg font-semibold">Safe Projection Rules</h3>
        <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
          <li className="flex items-start gap-2">
            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" />
            No full-content fetch (ADR-0001 D9)
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" />
            Only aggregated patterns across N ≥ 3 items (R2)
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" />
            Only user-authored or pattern-synthesized content (R5)
          </li>
        </ul>
      </div>
    </main>
  );
}
