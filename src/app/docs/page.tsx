import type { Metadata } from "next";
import Link from "next/link";
import {
  BookOpen,
  Bot,
  Compass,
  Eye,
  Lightbulb,
  Palette,
  Shield,
  Shuffle,
  Zap,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Documentation - FolioMuse",
  description:
    "Everything you need to know about FolioMuse: how it works, the gallery, the MCP agent, originality rules, and more.",
};

/**
 * /docs — comprehensive documentation page.
 *
 * Covers: introduction, how it works, the gallery, MCP agent, originality
 * rules, and agent-facing API reference. Server component — no state.
 */

function DocSection({
  id,
  icon: Icon,
  title,
  children,
}: {
  id: string;
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-heading`}
      className="flex scroll-mt-24 flex-col gap-6"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-4.5 w-4.5" />
        </div>
        <h2
          id={`${id}-heading`}
          className="font-display text-2xl font-semibold tracking-tight"
        >
          {title}
        </h2>
      </div>
      <div className="flex flex-col gap-4 text-base leading-relaxed text-muted-foreground">
        {children}
      </div>
    </section>
  );
}

function Callout({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-muted/30 p-5">
      <p className="font-display text-sm font-semibold text-foreground">
        {title}
      </p>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
        {children}
      </p>
    </div>
  );
}

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-lg border border-border bg-muted/50 p-4 font-mono text-sm text-foreground">
      <code>{children}</code>
    </pre>
  );
}

export default function DocsPage() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-16 px-4 pb-24 pt-12 sm:px-6 lg:px-8">
      {/* Header */}
      <header className="flex flex-col gap-4">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
          Documentation
        </p>
        <h1 className="font-display text-4xl font-semibold tracking-tighter sm:text-5xl">
          FolioMuse docs
        </h1>
        <p className="max-w-[65ch] text-lg leading-relaxed text-muted-foreground">
          Everything you need to know about building a portfolio that is
          genuinely your own — informed by real examples, sharpened by AI
          feedback, assembled with an agent.
        </p>
      </header>

      {/* Table of contents */}
      <nav
        aria-label="Documentation sections"
        className="rounded-xl border border-border bg-card p-6"
      >
        <p className="font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground">
          On this page
        </p>
        <ul className="mt-3 flex flex-col gap-2">
          {[
            ["introduction", "What is FolioMuse?"],
            ["how-it-works", "How it works"],
            ["gallery", "The gallery"],
            ["mcp-agent", "The MCP agent"],
            ["originality", "Originality rules"],
            ["for-agents", "For AI agents & automation"],
            ["api", "API reference"],
          ].map(([id, label]) => (
            <li key={id}>
              <a
                href={`#${id}`}
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {/* Sections */}
      <div className="flex flex-col gap-16">
        {/* Introduction */}
        <DocSection id="introduction" icon={BookOpen} title="What is FolioMuse?">
          <p>
            FolioMuse is a portfolio-building product composed of three connected
            pillars: a <strong>human gallery</strong> of real, attributed
            portfolio examples; <strong>section intelligence</strong> that gives
            AI-powered feedback on your portfolio structure; and an{" "}
            <strong>MCP agent</strong> that helps you assemble and refine your
            portfolio programmatically.
          </p>
          <p>
            The core promise: <em>See what works, understand why it works, and
            get help making your version — not a copy.</em>
          </p>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[
              {
                icon: Eye,
                title: "Human Gallery",
                desc: "Real portfolios from real professionals. Every entry is reviewed, scored, and attributed.",
              },
              {
                icon: Lightbulb,
                title: "Section Intelligence",
                desc: "AI analysis scoped to individual sections — hero, projects, case studies, about, contact.",
              },
              {
                icon: Bot,
                title: "MCP Agent",
                desc: "An AI assistant that helps you build, edit, and refine your portfolio through conversation.",
              },
            ].map((pillar) => {
              const PillarIcon = pillar.icon;
              return (
                <div
                  key={pillar.title}
                  className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <PillarIcon className="h-4 w-4" />
                  </div>
                  <p className="font-display text-sm font-semibold text-foreground">
                    {pillar.title}
                  </p>
                  <p className="text-sm text-muted-foreground">{pillar.desc}</p>
                </div>
              );
            })}
          </div>

          <Callout title="Who is FolioMuse for?">
            Builders (professionals refreshing their portfolio), Explorers
            (career-changers browsing for inspiration), and Agent Operators
            (users who prefer conversational tooling). See the{" "}
            <Link href="/docs#how-it-works" className="text-foreground underline underline-offset-4">
              how it works
            </Link>{" "}
            section below.
          </Callout>
        </DocSection>

        {/* How it works */}
        <DocSection id="how-it-works" icon={Zap} title="How it works">
          <p>
            FolioMuse follows a four-step process from discovery to a finished
            portfolio:
          </p>

          <div className="flex flex-col gap-4">
            {[
              {
                step: "01",
                title: "Discover",
                desc: "Browse the curated gallery. Filter by role, style, or stack. Find portfolios that resonate with your craft and aesthetic.",
              },
              {
                step: "02",
                title: "Study",
                desc: "Analyze what makes great portfolios work. Section patterns, layout strategies, and structural insights extracted from the best examples.",
              },
              {
                step: "03",
                title: "Draft",
                desc: "Start your own portfolio draft. The agent helps you structure sections and sharpen your narrative based on patterns across 3+ examples.",
              },
              {
                step: "04",
                title: "Assemble",
                desc: "Go from draft to polished portfolio in minutes. The agent assembles, you refine and ship. Every change is tracked in your edit history.",
              },
            ].map((item) => (
              <div
                key={item.step}
                className="flex gap-4 rounded-xl border border-border bg-card p-5"
              >
                <span className="font-mono text-2xl font-bold text-primary/30">
                  {item.step}
                </span>
                <div className="flex flex-col gap-1">
                  <p className="font-display text-base font-semibold text-foreground">
                    {item.title}
                  </p>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <Link
              href="/browse"
              className="inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 font-mono text-sm font-medium text-background transition-all hover:bg-foreground/90"
            >
              <Compass className="h-4 w-4" />
              Start exploring
            </Link>
            <Link
              href="/random"
              className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 font-mono text-sm font-medium text-foreground transition-all hover:bg-muted"
            >
              <Shuffle className="h-4 w-4" />
              Random portfolio
            </Link>
          </div>
        </DocSection>

        {/* Gallery */}
        <DocSection id="gallery" icon={Palette} title="The gallery">
          <p>
            The gallery is a curated collection of real, attributed portfolio
            examples. Every entry goes through a review process before being
            accepted.
          </p>

          <h3 className="font-display text-lg font-semibold text-foreground">
            Quality levels
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {[
              { level: "L4", label: "Exemplary", desc: "Exceptional craft, clear voice, strong structure." },
              { level: "L3", label: "Strong", desc: "Well-executed, good narrative, minor gaps." },
              { level: "L2", label: "Adequate", desc: "Meets acceptance threshold. Sections present, descriptions substantive." },
              { level: "L1", label: "Minimal", desc: "Below acceptance threshold. Significant gaps." },
            ].map((item) => (
              <div
                key={item.level}
                className="flex gap-3 rounded-lg border border-border bg-card p-4"
              >
                <span className="font-mono text-sm font-bold text-primary">
                  {item.level}
                </span>
                <div className="flex flex-col gap-0.5">
                  <p className="text-sm font-medium text-foreground">
                    {item.label}
                  </p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <h3 className="font-display text-lg font-semibold text-foreground">
            Filtering & discovery
          </h3>
          <p>
            The gallery supports filtering by role (designer, developer, etc.),
            style tags, stack tags, quality level, and consent tier. You can also
            search by title, creator name, or tags. Use the{" "}
            <Link href="/browse" className="text-foreground underline underline-offset-4">
              Browse page
            </Link>{" "}
            for full filtering, or hit{" "}
            <Link href="/random" className="text-foreground underline underline-offset-4">
              Random
            </Link>{" "}
            to discover something unexpected.
          </p>

          <Callout title="Attribution is immutable">
            Every gallery item carries attribution metadata (creator name, source
            URL, license type, consent date). This metadata is never stripped
            during processing and is always displayed alongside the content.
          </Callout>
        </DocSection>

        {/* MCP Agent */}
        <DocSection id="mcp-agent" icon={Bot} title="The MCP agent">
          <p>
            The FolioMuse MCP agent is an AI assistant that helps you build,
            edit, and refine your portfolio through natural-language
            conversation. It connects to your portfolio via the Model Context
            Protocol (MCP).
          </p>

          <h3 className="font-display text-lg font-semibold text-foreground">
            How the agent works
          </h3>
          <p>
            The agent analyzes patterns across multiple gallery examples (minimum
            3) to give you structural and content feedback. It never copies a
            single portfolio verbatim — suggestions are synthesized from
            aggregated patterns.
          </p>

          <div className="flex flex-col gap-4 rounded-xl border border-border bg-muted/30 p-6">
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-card px-3 py-1 font-mono text-xs text-muted-foreground">
              <span className="size-1.5 rounded-full bg-ring" aria-hidden />
              Example conversation
            </span>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  You
                </span>
                <div className="max-w-[85%] rounded-2xl border border-ring/40 bg-muted/60 px-4 py-3 text-sm text-card-foreground">
                  &ldquo;I&rsquo;m a front-end developer. My case study intro
                  feels flat. Can you help me sharpen it?&rdquo;
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  FolioMuse agent
                </span>
                <div className="max-w-[85%] rounded-2xl border border-border bg-card px-4 py-3 text-sm text-card-foreground">
                  Across 3+ developer portfolios, the strongest intros open with
                  the problem being solved and one concrete constraint — not the
                  stack. Try leading with the constraint instead.
                </div>
              </div>
            </div>
          </div>

          <h3 className="font-display text-lg font-semibold text-foreground">
            Agent safety rules
          </h3>
          <ul className="flex flex-col gap-2 pl-5">
            <li className="list-disc text-sm">
              <strong>R2:</strong> Suggestions derive from patterns aggregated
              across N &ge; 3 items, never a single source verbatim.
            </li>
            <li className="list-disc text-sm">
              <strong>R3:</strong> Attribution travels with content — always
              retrievable and displayed.
            </li>
            <li className="list-disc text-sm">
              <strong>R5:</strong> The agent only writes content you authored or
              synthesized guidance — never gallery copy.
            </li>
            <li className="list-disc text-sm">
              <strong>R6:</strong> AI-authored content is marked in your edit
              history.
            </li>
            <li className="list-disc text-sm">
              <strong>R7:</strong> You can see why a suggestion was made and
              reject it without side effects.
            </li>
          </ul>

          <Callout title="No full-content fetch">
            The MCP agent never exposes a &ldquo;fetch full gallery item
            content&rdquo; tool. It only works with aggregated patterns and your
            own content.
          </Callout>
        </DocSection>

        {/* Originality rules */}
        <DocSection id="originality" icon={Shield} title="Originality rules">
          <p>
            FolioMuse is built on a strict anti-cloning framework. These rules
            are binding on any feature touching the gallery, section
            intelligence, or MCP agent.
          </p>

          <div className="flex flex-col gap-3">
            {[
              {
                id: "R1",
                title: "No verbatim structural cloning",
                desc: "No feature may allow duplicating another gallery item's full structure + copy + assets as a single action.",
              },
              {
                id: "R2",
                title: "Synthesis, not sourcing",
                desc: "AI suggestions must be generated from patterns across multiple examples (N ≥ 3), never from a single item.",
              },
              {
                id: "R3",
                title: "Attribution travels with content",
                desc: "Attribution metadata is never stripped during processing and is always displayed alongside content.",
              },
              {
                id: "R4",
                title: "Consent-gated ingestion",
                desc: "No third-party content enters the gallery without explicit consent/licensing and attribution.",
              },
              {
                id: "R5",
                title: "Agent writes only user-owned content",
                desc: "The MCP agent may only write content authored by you or synthesized guidance — never gallery copy.",
              },
              {
                id: "R6",
                title: "Disclosure of AI authorship",
                desc: "AI-modified content is marked in your edit history, distinguishable from manually-typed content.",
              },
              {
                id: "R7",
                title: "Right to inspect and reject",
                desc: "You can see why a suggestion was made and reject it without side effects.",
              },
              {
                id: "R8",
                title: "Similarity monitoring",
                desc: "Published portfolios are checked against the originality-score guardrail at publish time.",
              },
            ].map((rule) => (
              <div
                key={rule.id}
                className="flex gap-4 rounded-lg border border-border bg-card p-4"
              >
                <span className="font-mono text-sm font-bold text-primary">
                  {rule.id}
                </span>
                <div className="flex flex-col gap-0.5">
                  <p className="text-sm font-medium text-foreground">
                    {rule.title}
                  </p>
                  <p className="text-xs text-muted-foreground">{rule.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </DocSection>

        {/* For agents */}
        <DocSection id="for-agents" icon={Bot} title="For AI agents & automation">
          <p>
            If you&rsquo;re an AI agent or automation tool accessing FolioMuse,
            this section covers the key endpoints and patterns you need.
          </p>

          <h3 className="font-display text-lg font-semibold text-foreground">
            Key endpoints
          </h3>
          <div className="flex flex-col gap-3">
            {[
              {
                method: "GET",
                path: "/api/gallery/summaries",
                desc: "Paginated gallery items. Supports filtering by role, style, stack, quality, consent. Returns { items, total, page, pageSize }.",
              },
              {
                method: "GET",
                path: "/api/gallery/facets",
                desc: "Facet counts for filter UIs (roles, styles, stacks, qualities, consents). Use this to populate filter chips.",
              },
              {
                method: "GET",
                path: "/api/gallery/random",
                desc: "Returns a random accepted portfolio ID. Use this for discovery features.",
              },
              {
                method: "GET",
                path: "/api/gallery/items/[id]",
                desc: "Full portfolio detail for a specific item. Includes sections, strengths, and stack evidence.",
              },
              {
                method: "GET",
                path: "/api/sections",
                desc: "Section pattern library. Browse reusable portfolio section patterns.",
              },
            ].map((endpoint) => (
              <div
                key={endpoint.path}
                className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4"
              >
                <div className="flex items-center gap-2">
                  <span className="rounded bg-primary/10 px-2 py-0.5 font-mono text-xs font-bold text-primary">
                    {endpoint.method}
                  </span>
                  <code className="font-mono text-sm text-foreground">
                    {endpoint.path}
                  </code>
                </div>
                <p className="text-sm text-muted-foreground">{endpoint.desc}</p>
              </div>
            ))}
          </div>

          <h3 className="font-display text-lg font-semibold text-foreground">
            Example: fetch a random portfolio
          </h3>
          <CodeBlock>{`// Fetch a random portfolio ID
const res = await fetch("/api/gallery/random");
const { id } = await res.json();

// Navigate to it
window.location.href = \`/gallery/\${id}\`;`}</CodeBlock>

          <h3 className="font-display text-lg font-semibold text-foreground">
            Example: search portfolios by role
          </h3>
          <CodeBlock>{`// Fetch front-end developer portfolios
const res = await fetch("/api/gallery/summaries?role=Front-end%20Developer");
const { items, total } = await res.json();

console.log(\`Found \${total} portfolios\`);
items.forEach(item => {
  console.log(item.title, item.attribution.creatorName);
});`}</CodeBlock>

          <h3 className="font-display text-lg font-semibold text-foreground">
            Safe projection rules
          </h3>
          <ul className="flex flex-col gap-2 pl-5">
            <li className="list-disc text-sm">
              No full-content fetch (ADR-0001). The API never returns raw
              content blobs.
            </li>
            <li className="list-disc text-sm">
              Only aggregated patterns across N &ge; 3 items (R2).
            </li>
            <li className="list-disc text-sm">
              Only user-authored or pattern-synthesized content (R5).
            </li>
            <li className="list-disc text-sm">
              Attribution is always included in responses (R3).
            </li>
          </ul>

          <Callout title="Rate limiting">
            The gallery API returns Cache-Control: no-store on all responses.
            There are no rate limits currently, but please be respectful of the
            service.
          </Callout>
        </DocSection>

        {/* API reference */}
        <DocSection id="api" icon={Zap} title="API reference">
          <p>
            All API endpoints return JSON and use Cache-Control: no-store. Errors
            return{" "}
            <code className="font-mono text-sm text-foreground">
              {"{ error, message }"}
            </code>
            .
          </p>

          <h3 className="font-display text-lg font-semibold text-foreground">
            Query parameters
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-2 pr-4 text-left font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    Param
                  </th>
                  <th className="py-2 pr-4 text-left font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    Type
                  </th>
                  <th className="py-2 text-left font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    Description
                  </th>
                </tr>
              </thead>
              <tbody className="text-muted-foreground">
                {[
                  ["q", "string", "Search query (title, role, tags)"],
                  ["role", "string[]", "Filter by creator role"],
                  ["style", "string[]", "Filter by style tags"],
                  ["stack", "string[]", "Filter by stack tags"],
                  ["quality", "string[]", "Filter by quality level (L0-L4)"],
                  ["consent", "string[]", "Filter by consent tier"],
                  ["sort", "string", "Sort: newest, title-asc, title-desc, quality"],
                  ["page", "number", "Page number (default: 1)"],
                  ["pageSize", "number", "Items per page (1-100, default: 24)"],
                ].map(([param, type, desc]) => (
                  <tr key={param} className="border-b border-border/50">
                    <td className="py-2 pr-4 font-mono text-xs text-foreground">
                      {param}
                    </td>
                    <td className="py-2 pr-4 font-mono text-xs">{type}</td>
                    <td className="py-2 text-sm">{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h3 className="font-display text-lg font-semibold text-foreground">
            Response shape
          </h3>
          <CodeBlock>{`{
  "items": [
    {
      "id": "clx...",
      "title": "Portfolio Title",
      "creatorRole": "Front-end Developer",
      "styleTags": ["minimal", "editorial"],
      "qualityLevel": "L3",
      "attribution": {
        "creatorName": "Jane Doe",
        "sourceUrl": "https://...",
        "licenseType": "DISPLAY",
        "consentDate": "2025-01-15T..."
      },
      "mediaUrl": "https://...",
      "stackTags": ["React", "TypeScript"]
    }
  ],
  "total": 42,
  "page": 1,
  "pageSize": 24
}`}</CodeBlock>
        </DocSection>
      </div>

      {/* Footer nav */}
      <nav className="flex flex-col gap-4 rounded-xl border border-border bg-card p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <p className="font-display text-base font-semibold text-foreground">
            Ready to explore?
          </p>
          <p className="text-sm text-muted-foreground">
            Browse the gallery or discover a random portfolio.
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/browse"
            className="inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 font-mono text-sm font-medium text-background transition-all hover:bg-foreground/90"
          >
            <Compass className="h-4 w-4" />
            Browse
          </Link>
          <Link
            href="/random"
            className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 font-mono text-sm font-medium text-foreground transition-all hover:bg-muted"
          >
            <Shuffle className="h-4 w-4" />
            Random
          </Link>
        </div>
      </nav>
    </main>
  );
}
