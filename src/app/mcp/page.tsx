import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Agent Operator",
  description: "MCP console for agent operators.",
};

export default function McpConsolePage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="font-display text-3xl font-semibold tracking-tight">Agent Operator</h1>
      <p className="mt-2 text-muted-foreground">MCP console — safe-projection only.</p>
      <section className="mt-8 rounded-xl border border-border bg-card p-6">
        <h2 className="font-display text-xl font-semibold">Safe Projection Rules</h2>
        <ul className="mt-4 list-disc pl-5 text-sm text-foreground">
          <li>No full-content fetch (ADR-0001 D9).</li>
          <li>Only aggregated patterns across N ≥ 3 items (R2).</li>
          <li>Only user-authored or pattern-synthesized content (R5).</li>
        </ul>
      </section>
    </main>
  );
}
