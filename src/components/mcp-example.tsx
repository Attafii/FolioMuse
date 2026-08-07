import { SectionHeader } from "@/components/section-header";

/**
 * Concrete MCP example (plan T13) — PRESENTATIONAL ONLY.
 *
 * Illustrates how the FolioMuse MCP agent helps a builder, embodying:
 *  - R2: suggestions derive from patterns aggregated across N >= 3 items
 *    ("Across the portfolios we reviewed…"), never a single item verbatim.
 *  - R5: the agent only improves the user's own draft — it never writes
 *    gallery item content into the portfolio.
 *  - ADR-0001: NO "fetch full gallery item content" tool is implied, and no
 *    MCP server/endpoint link exists (grep-verified by QA scenario).
 *
 * The builder is deliberately generic ("You") — never a real creator name.
 */

function ChatBubble({
  role,
  children,
}: {
  role: "builder" | "agent";
  children: React.ReactNode;
}) {
  const isAgent = role === "agent";
  return (
    <div
      data-testid={isAgent ? "agent-message" : "builder-message"}
      className={`flex flex-col gap-1.5 ${isAgent ? "items-start" : "items-end"}`}
    >
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {isAgent ? "FolioMuse agent" : "You"}
      </span>
      <div
        className={`max-w-[85%] rounded-2xl border px-4 py-3 text-sm leading-relaxed ${
          isAgent
            ? "border-border bg-card text-card-foreground"
            : "border-ring/40 bg-muted/60 text-card-foreground"
        }`}
      >
        {children}
      </div>
    </div>
  );
}

export function McpExample() {
  return (
    <section
      aria-labelledby="mcp-example-heading"
      data-testid="mcp-example"
      className="flex flex-col gap-8"
    >
      <SectionHeader
        id="mcp-example-heading"
        eyebrow="Concrete example"
        title="See the FolioMuse agent at work"
        description="How the agent helps you build — without ever copying a portfolio."
      />

      <div className="flex flex-col gap-6 rounded-2xl border border-border bg-muted/30 p-6 sm:p-8">
        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-card px-3 py-1 font-mono text-xs text-muted-foreground">
          <span className="size-1.5 rounded-full bg-ring" aria-hidden />
          Illustrative example
        </span>

        <div className="flex flex-col gap-5">
          <ChatBubble role="builder">
            <p>
              &ldquo;I&rsquo;m a front-end developer. I have my own case study
              draft, but the intro feels flat. Can you help me sharpen it and
              suggest what sections to lead with?&rdquo;
            </p>
          </ChatBubble>

          <ChatBubble role="agent">
            <p>
              Across the 3+ developer portfolios we reviewed, the strongest
              intros open with the problem being solved and one concrete
              constraint — not the stack. Your draft already names the tech;
              try leading with the constraint instead.
            </p>
            <p className="mt-3">
              Based on that pattern, here&rsquo;s a tightening of your own
              opening line (your words, re-ordered):
            </p>
            <p className="mt-3 border-l-2 border-ring/60 pl-3 font-medium">
              &ldquo;The map had to load in under a second — on hotel Wi-Fi,
              with 40k points. That constraint drove every choice in this
              case study.&rdquo;
            </p>
            <p className="mt-3 text-muted-foreground">
              I only reworked your text — I didn&rsquo;t pull copy from any
              gallery portfolio.
            </p>
          </ChatBubble>
        </div>

        <p className="border-t border-border pt-4 text-xs leading-relaxed text-muted-foreground">
          Why it works this way: the agent never shows or copies a single
          portfolio&rsquo;s full content. It generalizes patterns across at
          least three items (R2), keeps attribution with anything it references
          (R3), and only ever writes content you authored or synthesized
          guidance — never gallery copy (R5). Suggestions are yours to accept
          or reject, and anything the agent writes is marked in your edit
          history (R6, R7).
        </p>
      </div>
    </section>
  );
}
