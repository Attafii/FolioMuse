import type { Metadata } from "next";
import Link from "next/link";
import {
  BookOpen,
  Bot,
  Compass,
  Eye,
  FileText,
  Lightbulb,
  Palette,
  Shield,
  Shuffle,
  Users,
  Zap,
} from "lucide-react";

import { DocsSidebar, type DocNavItem } from "@/components/docs-sidebar";

export const metadata: Metadata = {
  title: "Documentation - FolioMuse",
  description:
    "Complete documentation for FolioMuse: introduction, how it works, the gallery, MCP agent, originality rules, API reference, and more.",
};

/**
 * /docs — comprehensive documentation with sidebar navigation.
 *
 * Layout: sticky left sidebar (scroll spy) + scrollable content area.
 * Server component — the sidebar is a client island for scroll detection.
 */

const NAV_ITEMS: DocNavItem[] = [
  {
    id: "introduction",
    label: "Introduction",
    icon: <BookOpen className="h-4 w-4" />,
    children: [
      { id: "what-is-foliomuse", label: "What is FolioMuse?" },
      { id: "three-pillars", label: "The three pillars" },
      { id: "who-is-it-for", label: "Who is it for?" },
      { id: "differentiation", label: "What makes it different" },
    ],
  },
  {
    id: "how-it-works",
    label: "How it works",
    icon: <Zap className="h-4 w-4" />,
    children: [
      { id: "four-steps", label: "The four-step process" },
      { id: "discovery", label: "Discovery" },
      { id: "study", label: "Study & analysis" },
      { id: "draft", label: "Drafting" },
      { id: "assemble", label: "Assembly" },
    ],
  },
  {
    id: "gallery",
    label: "The Gallery",
    icon: <Eye className="h-4 w-4" />,
    children: [
      { id: "quality-levels", label: "Quality levels (L0-L4)" },
      { id: "compliance", label: "Compliance gate" },
      { id: "acceptance", label: "Acceptance criteria" },
      { id: "filtering", label: "Filtering & discovery" },
      { id: "attribution", label: "Attribution" },
      { id: "consent", label: "Consent & revocation" },
      { id: "staleness", label: "Staleness policy" },
    ],
  },
  {
    id: "mcp-agent",
    label: "MCP Agent",
    icon: <Bot className="h-4 w-4" />,
    children: [
      { id: "agent-overview", label: "Overview" },
      { id: "agent-how", label: "How the agent works" },
      { id: "agent-example", label: "Example conversation" },
      { id: "agent-safety", label: "Safety rules" },
      { id: "agent-tools", label: "Available tools" },
    ],
  },
  {
    id: "originality",
    label: "Originality Rules",
    icon: <Shield className="h-4 w-4" />,
    children: [
      { id: "rule-r1", label: "R1: No cloning" },
      { id: "rule-r2", label: "R2: Synthesis" },
      { id: "rule-r3", label: "R3: Attribution" },
      { id: "rule-r4", label: "R4: Consent" },
      { id: "rule-r5", label: "R5: User content" },
      { id: "rule-r6", label: "R6: AI disclosure" },
      { id: "rule-r7", label: "R7: Inspect & reject" },
      { id: "rule-r8", label: "R8: Similarity" },
    ],
  },
  {
    id: "personas",
    label: "Personas",
    icon: <Users className="h-4 w-4" />,
    children: [
      { id: "persona-builder", label: "The Builder" },
      { id: "persona-explorer", label: "The Explorer" },
      { id: "persona-operator", label: "The Agent Operator" },
    ],
  },
  {
    id: "for-agents",
    label: "For AI Agents",
    icon: <FileText className="h-4 w-4" />,
    children: [
      { id: "agent-endpoints", label: "Key endpoints" },
      { id: "agent-examples", label: "Code examples" },
      { id: "agent-projection", label: "Safe projection" },
    ],
  },
  {
    id: "api",
    label: "API Reference",
    icon: <Zap className="h-4 w-4" />,
    children: [
      { id: "api-summaries", label: "GET /summaries" },
      { id: "api-facets", label: "GET /facets" },
      { id: "api-random", label: "GET /random" },
      { id: "api-detail", label: "GET /items/[id]" },
      { id: "api-params", label: "Query parameters" },
      { id: "api-response", label: "Response shape" },
    ],
  },
];

function Section({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24">
      {children}
    </section>
  );
}

function H2({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2
      id={id}
      className="scroll-mt-24 font-display text-2xl font-semibold tracking-tight"
    >
      {children}
    </h2>
  );
}

function H3({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h3
      id={id}
      className="scroll-mt-24 font-display text-lg font-semibold tracking-tight"
    >
      {children}
    </h3>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="text-base leading-relaxed text-muted-foreground">{children}</p>;
}

function Callout({
  title,
  children,
  variant = "default",
}: {
  title: string;
  children: React.ReactNode;
  variant?: "default" | "warning" | "info";
}) {
  const border =
    variant === "warning"
      ? "border-warning/50"
      : variant === "info"
        ? "border-info/50"
        : "border-border";
  return (
    <div className={`rounded-xl border ${border} bg-muted/30 p-5`}>
      <p className="font-display text-sm font-semibold text-foreground">
        {title}
      </p>
      <div className="mt-1 text-sm leading-relaxed text-muted-foreground">
        {children}
      </div>
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

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 font-mono text-xs font-medium text-primary">
      {children}
    </span>
  );
}

export default function DocsPage() {
  return (
    <div className="mx-auto flex w-full max-w-7xl gap-0 px-4 pt-12 sm:px-6 lg:px-8">
      {/* Sidebar */}
      <DocsSidebar items={NAV_ITEMS} />

      {/* Main content */}
      <main className="min-w-0 flex-1 pb-24 pl-0 lg:pl-8">
        {/* Header */}
        <header className="mb-12 flex flex-col gap-4">
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
          <div className="flex gap-3">
            <Link
              href="/browse"
              className="inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 font-mono text-sm font-medium text-background transition-all hover:bg-foreground/90"
            >
              <Compass className="h-4 w-4" />
              Explore the gallery
            </Link>
            <Link
              href="/random"
              className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 font-mono text-sm font-medium text-foreground transition-all hover:bg-muted"
            >
              <Shuffle className="h-4 w-4" />
              Random portfolio
            </Link>
          </div>
        </header>

        <div className="flex flex-col gap-16">
          {/* ═══════════════════════════════════════════════════════════ */}
          {/* INTRODUCTION */}
          {/* ═══════════════════════════════════════════════════════════ */}
          <Section id="introduction">
            <div className="flex flex-col gap-8">
              <div className="flex flex-col gap-3">
                <H2 id="what-is-foliomuse">What is FolioMuse?</H2>
                <P>
                  FolioMuse is a portfolio-building product that helps individual
                  creators and professionals build a portfolio that is genuinely
                  their own. It is <strong>not</strong> a template marketplace, a
                  cloning service, or a general-purpose website builder.
                </P>
                <P>
                  The core promise: <em>See what works, understand why it works,
                  and get help making your version — not a copy.</em>
                </P>
              </div>

              <div className="flex flex-col gap-3">
                <H3 id="three-pillars">The three pillars</H3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  {[
                    {
                      icon: <Eye className="h-5 w-5" />,
                      title: "Human Gallery",
                      desc: "A curated collection of real, attributed portfolio examples. Every entry is reviewed, scored (L0-L4), and carries immutable attribution metadata. Browse by role, style, stack, or quality level.",
                    },
                    {
                      icon: <Lightbulb className="h-5 w-5" />,
                      title: "Section Intelligence",
                      desc: "AI-powered analysis scoped to individual portfolio sections — hero, projects, case studies, about, contact. Feedback is grounded in patterns across 3+ examples, never a single source.",
                    },
                    {
                      icon: <Bot className="h-5 w-5" />,
                      title: "MCP Agent",
                      desc: "An AI assistant that helps you build, edit, and refine your portfolio through natural-language conversation. It only writes content you authored or synthesized guidance.",
                    },
                  ].map((pillar) => (
                    <div
                      key={pillar.title}
                      className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        {pillar.icon}
                      </div>
                      <p className="font-display text-base font-semibold text-foreground">
                        {pillar.title}
                      </p>
                      <P>{pillar.desc}</P>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <H3 id="who-is-it-for">Who is FolioMuse for?</H3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="rounded-lg border border-border bg-card p-4">
                    <p className="font-display text-sm font-semibold text-foreground">
                      P1 — The Builder
                    </p>
                    <P>
                      Professionals actively building or refreshing their
                      portfolio. Has real work to showcase but unsure about
                      structure/presentation.
                    </P>
                  </div>
                  <div className="rounded-lg border border-border bg-card p-4">
                    <p className="font-display text-sm font-semibold text-foreground">
                      P2 — The Explorer
                    </p>
                    <P>
                      Career-changers or early-career professionals browsing for
                      inspiration before having much content of their own.
                    </P>
                  </div>
                  <div className="rounded-lg border border-border bg-card p-4">
                    <p className="font-display text-sm font-semibold text-foreground">
                      P3 — The Agent Operator
                    </p>
                    <P>
                      Users who prefer conversational tooling. Describe intent
                      and have the agent apply changes using your own content.
                    </P>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <H3 id="differentiation">What makes FolioMuse different?</H3>
                <div className="flex flex-col gap-2">
                  {[
                    "Generic AI tools produce generic output. FolioMuse produces feedback grounded in real, attributed examples.",
                    "Portfolio templates produce identical-looking sites. FolioMuse helps you understand why a layout works, then build your own.",
                    "Other tools let you copy. FolioMuse enforces originality through 8 binding rules (R1-R8) and a compliance gate.",
                    "Section-level intelligence gives feedback on specific parts of your portfolio, not vague whole-site advice.",
                  ].map((item, i) => (
                    <div key={i} className="flex gap-3 rounded-lg border border-border bg-card p-4">
                      <span className="font-mono text-sm font-bold text-primary">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <P>{item}</P>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Section>

          {/* ═══════════════════════════════════════════════════════════ */}
          {/* HOW IT WORKS */}
          {/* ═══════════════════════════════════════════════════════════ */}
          <Section id="how-it-works">
            <div className="flex flex-col gap-8">
              <H2 id="four-steps">The four-step process</H2>
              <P>
                FolioMuse follows a clear path from discovery to a finished
                portfolio. Each step builds on the previous one.
              </P>

              <div className="flex flex-col gap-4">
                {[
                  {
                    step: "01",
                    id: "discovery",
                    title: "Discover",
                    desc: "Browse the curated gallery of real portfolios. Filter by role (designer, developer, photographer, etc.), style tags (minimal, editorial, dark), stack tags (React, Figma, etc.), or quality level. Use the search bar for keyword matching across titles, creators, and tags. Hit Random to discover something unexpected.",
                    details: [
                      "The gallery contains portfolios that have passed a quality review (L2 or above) and compliance check.",
                      "Every portfolio carries attribution: creator name, source URL, license type, and consent date.",
                      "Facet counts are computed server-side — you see how many portfolios match each filter before applying it.",
                    ],
                  },
                  {
                    step: "02",
                    id: "study",
                    title: "Study & analyze",
                    desc: "Open any portfolio to see its full detail view: sections, strengths, stack evidence, and quality score. Understand what makes it work — the structure, the narrative, the visual hierarchy.",
                    details: [
                      "Section patterns are extracted from the portfolio: hero, projects, case studies, about, contact, and more.",
                      "Strengths are identified by the curation system: clear problem statements, strong visual hierarchy, specific outcomes.",
                      "Stack evidence shows what technologies were used and how they're demonstrated in the portfolio.",
                    ],
                  },
                  {
                    step: "03",
                    id: "draft",
                    title: "Draft your portfolio",
                    desc: "Start your own portfolio draft. The MCP agent helps you structure sections and sharpen your narrative based on patterns across 3+ examples. You write; the agent refines.",
                    details: [
                      "The agent never writes content from scratch — it improves your existing draft.",
                      "Suggestions are synthesized from aggregated patterns, never copied from a single portfolio.",
                      "Every agent edit is marked in your edit history so you can see what changed and why.",
                    ],
                  },
                  {
                    step: "04",
                    id: "assemble",
                    title: "Assemble & ship",
                    desc: "Go from draft to polished portfolio in minutes. The agent assembles sections, you refine the details, and ship. Every change is tracked, every suggestion is rejectable.",
                    details: [
                      "Before publishing, an originality check compares your portfolio against gallery items.",
                      "You can always see why a suggestion was made and reject it without side effects.",
                      "Published portfolios are monitored for similarity (R8) to maintain gallery integrity.",
                    ],
                  },
                ].map((item) => (
                  <div
                    key={item.step}
                    className="flex flex-col gap-4 rounded-xl border border-border bg-card p-6"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-2xl font-bold text-primary/30">
                        {item.step}
                      </span>
                      <H3 id={item.id}>{item.title}</H3>
                    </div>
                    <P>{item.desc}</P>
                    <ul className="flex flex-col gap-2 pl-5">
                      {item.details.map((detail, i) => (
                        <li key={i} className="list-disc text-sm text-muted-foreground">
                          {detail}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </Section>

          {/* ═══════════════════════════════════════════════════════════ */}
          {/* GALLERY */}
          {/* ═══════════════════════════════════════════════════════════ */}
          <Section id="gallery">
            <div className="flex flex-col gap-8">
              <H2 id="quality-levels">Quality levels (L0-L4)</H2>
              <P>
                Every gallery item is scored on a five-level quality scale. Quality
                is a structural and presentation-level assessment: &ldquo;is this
                portfolio well built, clear, and informative enough to serve as a
                pattern reference?&rdquo;
              </P>

              <div className="flex flex-col gap-3">
                {[
                  {
                    level: "L0",
                    label: "Unusable",
                    desc: "Too incomplete, vague, or poorly structured to serve as a pattern reference. No recognizable portfolio sections.",
                    example: "A page with only a name and email link, no project descriptions, broken images.",
                  },
                  {
                    level: "L1",
                    label: "Minimal",
                    desc: "Recognizable as a portfolio but lacks depth. Sections exist but contain thin content (one-liners, placeholders).",
                    example: "A portfolio with a hero (name + tagline only), a single projects list (titles only), and a contact link.",
                  },
                  {
                    level: "L2",
                    label: "Adequate",
                    desc: "The minimum acceptance threshold. Sections are present, descriptions are substantive, and a reviewer can understand the creator's work.",
                    example: "A designer's portfolio with hero, three case studies (problem, approach, outcome), about section, and contact.",
                  },
                  {
                    level: "L3",
                    label: "Strong",
                    desc: "Exceeds the baseline with depth, clarity, and intentional design. High-confidence reference for structure and tone.",
                    example: "A developer's portfolio with detailed case studies (problem, approach, tech, results with metrics), substantive about, and additional sections.",
                  },
                  {
                    level: "L4",
                    label: "Exemplary",
                    desc: "Best-in-class craftsmanship. Rich content throughout, intentional structure at every level, accessibility considered.",
                    example: "A UX researcher's portfolio with structured narrative case studies, comprehensive about, blog, speaking page, and original visuals.",
                  },
                ].map((item) => (
                  <div
                    key={item.level}
                    className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4"
                  >
                    <div className="flex items-center gap-3">
                      <Badge>{item.level}</Badge>
                      <p className="font-display text-sm font-semibold text-foreground">
                        {item.label}
                      </p>
                    </div>
                    <P>{item.desc}</P>
                    <p className="text-xs italic text-muted-foreground">
                      Example: {item.example}
                    </p>
                  </div>
                ))}
              </div>

              <Callout title="Scoring rule">
                When a reviewer scores an item, they assign the highest level whose
                criteria are fully met. Section count is necessary but not sufficient
                — content depth across all present sections determines the final level.
              </Callout>

              <div className="flex flex-col gap-3">
                <H2 id="compliance">Compliance gate</H2>
                <P>
                  Compliance is evaluated independently from quality. It checks
                  whether the item meets FolioMuse&rsquo;s binding rules around
                  consent, attribution, and originality.
                </P>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="rounded-lg border border-success/30 bg-success/5 p-4">
                    <p className="font-display text-sm font-semibold text-success">PASS</p>
                    <P>All mandatory compliance checks passed. No blocking issues.</P>
                  </div>
                  <div className="rounded-lg border border-warning/30 bg-warning/5 p-4">
                    <p className="font-display text-sm font-semibold text-warning">FLAG</p>
                    <P>Non-blocking concern recorded. Item can still be accepted if quality meets threshold.</P>
                  </div>
                  <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
                    <p className="font-display text-sm font-semibold text-destructive">FAIL</p>
                    <P>Violates a mandatory rule. Cannot be accepted regardless of quality score.</P>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <H3 id="mandatory-checks">Mandatory compliance checks</H3>
                <ol className="flex flex-col gap-3 pl-5">
                  <li className="list-decimal text-sm text-muted-foreground">
                    <strong className="text-foreground">Attribution completeness (R3):</strong> creatorName, sourceUrl, licenseType, and consentDate must all be present and non-empty.
                  </li>
                  <li className="list-decimal text-sm text-muted-foreground">
                    <strong className="text-foreground">Consent validity (R4):</strong> a ConsentRecord must exist with tier ≥ DISPLAY. The consentedBy field must identify a real entity.
                  </li>
                  <li className="list-decimal text-sm text-muted-foreground">
                    <strong className="text-foreground">No cross-creator cloning:</strong> the item must not be a structural copy of another creator&rsquo;s item with attribution changed.
                  </li>
                  <li className="list-decimal text-sm text-muted-foreground">
                    <strong className="text-foreground">No fabricated credibility:</strong> the item must not present AI-generated content as verified real-world claims.
                  </li>
                  <li className="list-decimal text-sm text-muted-foreground">
                    <strong className="text-foreground">Attribution integrity under processing:</strong> attribution metadata must remain intact through any retrieval or embedding pipeline.
                  </li>
                </ol>
              </div>

              <div className="flex flex-col gap-3">
                <H2 id="acceptance">Acceptance criteria</H2>
                <P>
                  An item is accepted into the gallery only when <strong>all</strong> of
                  these conditions are met simultaneously:
                </P>
                <ol className="flex flex-col gap-2 pl-5">
                  <li className="list-decimal text-sm text-muted-foreground">Quality ≥ L2 (Adequate)</li>
                  <li className="list-decimal text-sm text-muted-foreground">Compliance = PASS (or FLAG with documented rationale)</li>
                  <li className="list-decimal text-sm text-muted-foreground">Consent exists with tier ≥ DISPLAY</li>
                  <li className="list-decimal text-sm text-muted-foreground">Attribution is complete (all four fields present)</li>
                  <li className="list-decimal text-sm text-muted-foreground">No duplicate detected</li>
                  <li className="list-decimal text-sm text-muted-foreground">Coverage gap assessed (informational, does not block)</li>
                </ol>
              </div>

              <div className="flex flex-col gap-3">
                <H2 id="filtering">Filtering & discovery</H2>
                <P>
                  The gallery supports multiple filtering dimensions, all powered by
                  server-computed facet counts:
                </P>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border border-border bg-card p-4">
                    <p className="font-display text-sm font-semibold text-foreground">By role</p>
                    <P>Designer, developer, photographer, PM, writer, and more. Roles are derived from data, never hardcoded.</P>
                  </div>
                  <div className="rounded-lg border border-border bg-card p-4">
                    <p className="font-display text-sm font-semibold text-foreground">By style</p>
                    <P>Minimal, editorial, dark, interactive, illustrated, and more. Style tags describe the visual language.</P>
                  </div>
                  <div className="rounded-lg border border-border bg-card p-4">
                    <p className="font-display text-sm font-semibold text-foreground">By stack</p>
                    <P>React, Figma, Next.js, Tailwind, and more. Stack tags describe the technology used.</P>
                  </div>
                  <div className="rounded-lg border border-border bg-card p-4">
                    <p className="font-display text-sm font-semibold text-foreground">By quality</p>
                    <P>Filter by quality level (L0-L4) to see only the best examples in the gallery.</P>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <H2 id="attribution">Attribution</H2>
                <P>
                  Every gallery item carries attribution metadata that is{" "}
                  <strong>immutable</strong> — it can never be stripped, modified, or
                  hidden. Attribution includes:
                </P>
                <ul className="flex flex-col gap-2 pl-5">
                  <li className="list-disc text-sm text-muted-foreground">
                    <strong className="text-foreground">Creator name:</strong> the person or organization who created the portfolio.
                  </li>
                  <li className="list-disc text-sm text-muted-foreground">
                    <strong className="text-foreground">Source URL:</strong> the original location of the portfolio.
                  </li>
                  <li className="list-disc text-sm text-muted-foreground">
                    <strong className="text-foreground">License type:</strong> the terms under which the portfolio is displayed.
                  </li>
                  <li className="list-disc text-sm text-muted-foreground">
                    <strong className="text-foreground">Consent date:</strong> when consent was granted for gallery inclusion.
                  </li>
                </ul>
                <Callout title="R3: Attribution travels with content">
                  Any time gallery content is displayed, referenced in feedback, or
                  used to ground an AI suggestion, its attribution metadata must be
                  retrievable and displayed. Attribution is never stripped during
                  processing pipelines.
                </Callout>
              </div>

              <div className="flex flex-col gap-3">
                <H2 id="consent">Consent & revocation</H2>
                <P>
                  No third-party portfolio content enters the gallery without explicit
                  consent. Consent is recorded with:
                </P>
                <ul className="flex flex-col gap-2 pl-5">
                  <li className="list-disc text-sm text-muted-foreground">
                    <strong className="text-foreground">Tier:</strong> DISPLAY, PATTERN_DERIVE, or FULL.
                  </li>
                  <li className="list-disc text-sm text-muted-foreground">
                    <strong className="text-foreground">Consented by:</strong> who granted consent (individual or organization).
                  </li>
                  <li className="list-disc text-sm text-muted-foreground">
                    <strong className="text-foreground">Consented at:</strong> when consent was granted.
                  </li>
                  <li className="list-disc text-sm text-muted-foreground">
                    <strong className="text-foreground">Terms:</strong> the specific terms of the consent.
                  </li>
                </ul>
                <P>
                  Creators can revoke consent at any time. When consent is revoked, the
                  item is archived immediately and excluded from all active queries.
                </P>
              </div>

              <div className="flex flex-col gap-3">
                <H2 id="staleness">Staleness policy</H2>
                <P>
                  Gallery items can become stale over time. A portfolio from 2020 may
                  no longer represent current design patterns.
                </P>
                <ul className="flex flex-col gap-2 pl-5">
                  <li className="list-disc text-sm text-muted-foreground">
                    <strong className="text-foreground">Threshold:</strong> 18 months since last review with no re-validation.
                  </li>
                  <li className="list-disc text-sm text-muted-foreground">
                    <strong className="text-foreground">Action:</strong> item is archived (status → ARCHIVED), not deleted.
                  </li>
                  <li className="list-disc text-sm text-muted-foreground">
                    <strong className="text-foreground">Resubmission:</strong> archived items can be resubmitted if content has been materially updated.
                  </li>
                </ul>
              </div>
            </div>
          </Section>

          {/* ═══════════════════════════════════════════════════════════ */}
          {/* MCP AGENT */}
          {/* ═══════════════════════════════════════════════════════════ */}
          <Section id="mcp-agent">
            <div className="flex flex-col gap-8">
              <div className="flex flex-col gap-3">
                <H2 id="agent-overview">MCP Agent overview</H2>
                <P>
                  The FolioMuse MCP agent is an AI assistant that helps you build,
                  edit, and refine your portfolio through natural-language
                  conversation. It connects via the Model Context Protocol (MCP).
                </P>
                <P>
                  The agent is <strong>not</strong> a chatbot that generates generic
                  content. It&rsquo;s a specialized tool that understands portfolio
                  structure, analyzes patterns across real examples, and helps you
                  improve your own work.
                </P>
              </div>

              <div className="flex flex-col gap-3">
                <H3 id="agent-how">How the agent works</H3>
                <ol className="flex flex-col gap-3 pl-5">
                  <li className="list-decimal text-sm text-muted-foreground">
                    <strong className="text-foreground">Pattern analysis:</strong> the agent analyzes patterns across multiple gallery examples (minimum 3) to understand what works in your field.
                  </li>
                  <li className="list-decimal text-sm text-muted-foreground">
                    <strong className="text-foreground">Feedback generation:</strong> based on those patterns, it gives you structural and content feedback scoped to specific sections.
                  </li>
                  <li className="list-decimal text-sm text-muted-foreground">
                    <strong className="text-foreground">Content refinement:</strong> it helps you refine your own draft — reordering, tightening, sharpening — never writing from scratch.
                  </li>
                  <li className="list-decimal text-sm text-muted-foreground">
                    <strong className="text-foreground">Edit tracking:</strong> every change the agent makes is marked in your edit history, distinguishable from your own edits.
                  </li>
                </ol>
              </div>

              <div className="flex flex-col gap-3">
                <H3 id="agent-example">Example conversation</H3>
                <div className="flex flex-col gap-4 rounded-xl border border-border bg-muted/30 p-6">
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        You
                      </span>
                      <div className="max-w-[85%] rounded-2xl border border-ring/40 bg-muted/60 px-4 py-3 text-sm text-card-foreground">
                        &ldquo;I&rsquo;m a front-end developer. I have my own case
                        study draft, but the intro feels flat. Can you help me
                        sharpen it and suggest what sections to lead with?&rdquo;
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        FolioMuse agent
                      </span>
                      <div className="max-w-[85%] rounded-2xl border border-border bg-card px-4 py-3 text-sm text-card-foreground">
                        <p>
                          Across the 3+ developer portfolios we reviewed, the
                          strongest intros open with the problem being solved and
                          one concrete constraint — not the stack. Your draft
                          already names the tech; try leading with the constraint
                          instead.
                        </p>
                        <p className="mt-3">
                          Based on that pattern, here&rsquo;s a tightening of your
                          own opening line (your words, re-ordered):
                        </p>
                        <p className="mt-3 border-l-2 border-ring/60 pl-3 font-medium">
                          &ldquo;The map had to load in under a second — on hotel
                          Wi-Fi, with 40k points. That constraint drove every
                          choice in this case study.&rdquo;
                        </p>
                        <p className="mt-3 text-muted-foreground">
                          I only reworked your text — I didn&rsquo;t pull copy from
                          any gallery portfolio.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <H3 id="agent-safety">Safety rules</H3>
                <div className="flex flex-col gap-3">
                  {[
                    { rule: "R2", title: "Synthesis, not sourcing", desc: "Suggestions derive from patterns aggregated across N ≥ 3 items, never a single source verbatim." },
                    { rule: "R3", title: "Attribution travels", desc: "Attribution is always retrievable and displayed alongside any referenced content." },
                    { rule: "R5", title: "User content only", desc: "The agent only writes content you authored or synthesized guidance — never gallery copy." },
                    { rule: "R6", title: "AI disclosure", desc: "AI-authored content is marked in your edit history, distinguishable from manually-typed content." },
                    { rule: "R7", title: "Inspect & reject", desc: "You can see why a suggestion was made and reject it without side effects." },
                  ].map((item) => (
                    <div key={item.rule} className="flex gap-4 rounded-lg border border-border bg-card p-4">
                      <Badge>{item.rule}</Badge>
                      <div className="flex flex-col gap-1">
                        <p className="text-sm font-medium text-foreground">{item.title}</p>
                        <P>{item.desc}</P>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <H3 id="agent-tools">Available tools</H3>
                <P>
                  The MCP agent exposes these tools (all respect safe projection
                  rules — no full-content fetch):
                </P>
                <div className="flex flex-col gap-2">
                  {[
                    { name: "list_gallery_items", desc: "Browse accepted gallery items with filtering and pagination." },
                    { name: "get_item_summary", desc: "Get metadata and attribution for a specific gallery item." },
                    { name: "get_section_patterns", desc: "Get aggregated section patterns across multiple items." },
                    { name: "analyze_portfolio_section", desc: "Analyze a user's portfolio section against patterns." },
                    { name: "suggest_improvements", desc: "Get improvement suggestions for a specific section." },
                  ].map((tool) => (
                    <div key={tool.name} className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
                      <code className="font-mono text-xs text-primary">{tool.name}</code>
                      <P>{tool.desc}</P>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Section>

          {/* ═══════════════════════════════════════════════════════════ */}
          {/* ORIGINALITY RULES */}
          {/* ═══════════════════════════════════════════════════════════ */}
          <Section id="originality">
            <div className="flex flex-col gap-8">
              <H2 id="originality-rules">Originality rules (R1-R8)</H2>
              <P>
                These rules are <strong>binding</strong> on any feature touching the
                gallery, section intelligence, or MCP agent. A feature that violates
                any rule must be rejected or amended before merge.
              </P>

              <div className="flex flex-col gap-4">
                {[
                  {
                    id: "rule-r1",
                    rule: "R1",
                    title: "No verbatim structural cloning",
                    desc: "No feature may allow a user to duplicate another gallery item's full structure + copy + assets as a single action that produces a near-identical portfolio.",
                    detail: "This is enforced at the compliance gate through cross-creator clone detection. The quality scoring rules also incentivize against cloning: L3+ requires original, specific content.",
                  },
                  {
                    id: "rule-r2",
                    rule: "R2",
                    title: "Synthesis, not sourcing",
                    desc: "Section-intelligence suggestions must be generated from patterns aggregated across multiple gallery examples (minimum N ≥ 3), never from a single item's exact content.",
                    detail: "If only one relevant example exists, the system falls back to general structural principles rather than paraphrasing that one item.",
                  },
                  {
                    id: "rule-r3",
                    rule: "R3",
                    title: "Attribution travels with content",
                    desc: "Any time gallery content is displayed, referenced in feedback, or used to ground an AI suggestion, its attribution/provenance metadata must be retrievable and displayed.",
                    detail: "Attribution is stored as a non-nullable foreign key in the schema and enforced at the persistence layer.",
                  },
                  {
                    id: "rule-r4",
                    rule: "R4",
                    title: "Consent-gated ingestion",
                    desc: "No third-party portfolio content enters the gallery without an explicit consent/licensing record. Scraping without consent is prohibited.",
                    detail: "The consent model records who consented, when, and under what terms. Consent can be revoked at any time.",
                  },
                  {
                    id: "rule-r5",
                    rule: "R5",
                    title: "Agent writes only user-owned content",
                    desc: "The MCP agent may only write content that is either authored/dictated by the user or synthesized guidance derived per R2. It must never copy gallery item content directly.",
                    detail: "This is the core anti-cloning rule for the agent. All agent output must be traceable to the user's own inputs plus synthesized guidance.",
                  },
                  {
                    id: "rule-r6",
                    rule: "R6",
                    title: "Disclosure of AI authorship",
                    desc: "Any content inserted or modified by the MCP agent must be marked as such in the portfolio's edit/version history, distinguishable from manually-typed user content.",
                    detail: "This ensures transparency and allows users to see exactly what the agent changed.",
                  },
                  {
                    id: "rule-r7",
                    rule: "R7",
                    title: "Right to inspect and reject",
                    desc: "Users must always be able to see why a suggestion was made and reject it without side effects. Suggestions must never auto-apply without explicit user action.",
                    detail: "Unless the user has explicitly configured an auto-accept policy, every suggestion requires manual acceptance.",
                  },
                  {
                    id: "rule-r8",
                    rule: "R8",
                    title: "Similarity monitoring",
                    desc: "Before or at publish time, a published portfolio should be checked against the originality-score guardrail. The signal is computed and logged.",
                    detail: "The exact algorithm and threshold are defined in an ADR. The data model is ready for enforcement (warn vs. block) in a future version.",
                  },
                ].map((item) => (
                  <div
                    key={item.rule}
                    id={item.id}
                    className="flex scroll-mt-24 flex-col gap-3 rounded-xl border border-border bg-card p-5"
                  >
                    <div className="flex items-center gap-3">
                      <Badge>{item.rule}</Badge>
                      <p className="font-display text-base font-semibold text-foreground">
                        {item.title}
                      </p>
                    </div>
                    <P>{item.desc}</P>
                    <p className="text-xs text-muted-foreground">{item.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          </Section>

          {/* ═══════════════════════════════════════════════════════════ */}
          {/* PERSONAS */}
          {/* ═══════════════════════════════════════════════════════════ */}
          <Section id="personas">
            <div className="flex flex-col gap-8">
              <H2 id="personas-heading">Personas</H2>

              <div className="flex flex-col gap-4">
                <div id="persona-builder" className="scroll-mt-24 flex flex-col gap-3 rounded-xl border border-border bg-card p-5">
                  <div className="flex items-center gap-2">
                    <Badge>P1</Badge>
                    <p className="font-display text-base font-semibold text-foreground">
                      The Builder (primary)
                    </p>
                  </div>
                  <P>
                    An individual professional (designer, developer, writer,
                    photographer, PM) who has real work to showcase but is unsure
                    how to structure or present it. Actively job-hunting,
                    freelancing, or refreshing an existing portfolio.
                  </P>
                  <div className="flex flex-col gap-1">
                    <p className="text-sm font-medium text-foreground">Goals:</p>
                    <ul className="flex flex-col gap-1 pl-5">
                      <li className="list-disc text-sm text-muted-foreground">Present actual work clearly and credibly.</li>
                      <li className="list-disc text-sm text-muted-foreground">Understand what &ldquo;good&rdquo; looks like without studying dozens of sites.</li>
                      <li className="list-disc text-sm text-muted-foreground">Get concrete, section-specific feedback.</li>
                    </ul>
                  </div>
                </div>

                <div id="persona-explorer" className="scroll-mt-24 flex flex-col gap-3 rounded-xl border border-border bg-card p-5">
                  <div className="flex items-center gap-2">
                    <Badge>P2</Badge>
                    <p className="font-display text-base font-semibold text-foreground">
                      The Explorer
                    </p>
                  </div>
                  <P>
                    Someone earlier in their career (student, career-changer,
                    junior professional) who doesn&rsquo;t yet have a strong
                    portfolio. Browsing for inspiration and structural
                    understanding before producing much work of their own.
                  </P>
                  <div className="flex flex-col gap-1">
                    <p className="text-sm font-medium text-foreground">Goals:</p>
                    <ul className="flex flex-col gap-1 pl-5">
                      <li className="list-disc text-sm text-muted-foreground">Understand what sections/structure a portfolio in their field needs.</li>
                      <li className="list-disc text-sm text-muted-foreground">Build confidence about what &ldquo;enough&rdquo; looks like.</li>
                      <li className="list-disc text-sm text-muted-foreground">Avoid copying someone else&rsquo;s site.</li>
                    </ul>
                  </div>
                </div>

                <div id="persona-operator" className="scroll-mt-24 flex flex-col gap-3 rounded-xl border border-border bg-card p-5">
                  <div className="flex items-center gap-2">
                    <Badge>P3</Badge>
                    <p className="font-display text-base font-semibold text-foreground">
                      The Agent Operator
                    </p>
                  </div>
                  <P>
                    A user who prefers conversational or programmatic tooling.
                    Wants to describe intent (&ldquo;tighten my hero section&rdquo;)
                    and have the agent apply it, using their own content.
                  </P>
                  <div className="flex flex-col gap-1">
                    <p className="text-sm font-medium text-foreground">Goals:</p>
                    <ul className="flex flex-col gap-1 pl-5">
                      <li className="list-disc text-sm text-muted-foreground">Make edits through natural-language instructions.</li>
                      <li className="list-disc text-sm text-muted-foreground">Trust that agent advice is grounded in real patterns.</li>
                      <li className="list-disc text-sm text-muted-foreground">Keep full ownership/authorship of content.</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </Section>

          {/* ═══════════════════════════════════════════════════════════ */}
          {/* FOR AI AGENTS */}
          {/* ═══════════════════════════════════════════════════════════ */}
          <Section id="for-agents">
            <div className="flex flex-col gap-8">
              <H2 id="agent-endpoints">For AI agents & automation</H2>
              <P>
                If you&rsquo;re an AI agent or automation tool accessing FolioMuse,
                this section covers the key endpoints and patterns you need.
              </P>

              <div className="flex flex-col gap-3">
                {[
                  {
                    method: "GET",
                    path: "/api/gallery/summaries",
                    desc: "Paginated gallery items with filtering. Returns { items, total, page, pageSize }.",
                    params: "q, role, style, stack, quality, consent, sort, page, pageSize",
                  },
                  {
                    method: "GET",
                    path: "/api/gallery/facets",
                    desc: "Facet counts for filter UIs. Returns { facets: { roles, styles, stacks, qualities, consents, total } }.",
                    params: "None",
                  },
                  {
                    method: "GET",
                    path: "/api/gallery/random",
                    desc: "Returns a random accepted portfolio ID. Returns { id }.",
                    params: "None",
                  },
                  {
                    method: "GET",
                    path: "/api/gallery/items/[id]",
                    desc: "Full portfolio detail including sections, strengths, stack evidence.",
                    params: "id (path)",
                  },
                  {
                    method: "GET",
                    path: "/api/sections",
                    desc: "Section pattern library. Browse reusable portfolio section patterns.",
                    params: "sectionType (optional)",
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
                    <P>{endpoint.desc}</P>
                    <p className="font-mono text-xs text-muted-foreground">
                      Params: {endpoint.params}
                    </p>
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-3">
                <H3 id="agent-examples">Code examples</H3>
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-2">
                    <p className="text-sm font-medium text-foreground">
                      Fetch a random portfolio
                    </p>
                    <CodeBlock>{`const res = await fetch("/api/gallery/random");
const { id } = await res.json();
window.location.href = \`/gallery/\${id}\`;`}</CodeBlock>
                  </div>
                  <div className="flex flex-col gap-2">
                    <p className="text-sm font-medium text-foreground">
                      Search portfolios by role
                    </p>
                    <CodeBlock>{`const res = await fetch(
  "/api/gallery/summaries?role=Front-end%20Developer&pageSize=10"
);
const { items, total } = await res.json();
console.log(\`Found \${total} portfolios\`);
items.forEach(item => {
  console.log(item.title, item.attribution.creatorName);
});`}</CodeBlock>
                  </div>
                  <div className="flex flex-col gap-2">
                    <p className="text-sm font-medium text-foreground">
                      Get facet counts for filters
                    </p>
                    <CodeBlock>{`const res = await fetch("/api/gallery/facets");
const { facets } = await res.json();

// facets.roles: [{ value: "Designer", count: 15 }, ...]
// facets.styles: [{ value: "minimal", count: 8 }, ...]
facets.roles.forEach(r => console.log(\`\${r.value}: \${r.count}\`));`}</CodeBlock>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <H3 id="agent-projection">Safe projection rules</H3>
                <ul className="flex flex-col gap-2 pl-5">
                  <li className="list-disc text-sm text-muted-foreground">
                    <strong className="text-foreground">No full-content fetch (ADR-0001):</strong> the API never returns raw content blobs.
                  </li>
                  <li className="list-disc text-sm text-muted-foreground">
                    <strong className="text-foreground">Aggregated patterns only (R2):</strong> only patterns across N ≥ 3 items.
                  </li>
                  <li className="list-disc text-sm text-muted-foreground">
                    <strong className="text-foreground">User content only (R5):</strong> only user-authored or pattern-synthesized content.
                  </li>
                  <li className="list-disc text-sm text-muted-foreground">
                    <strong className="text-foreground">Attribution always included (R3):</strong> every response includes attribution metadata.
                  </li>
                </ul>
              </div>
            </div>
          </Section>

          {/* ═══════════════════════════════════════════════════════════ */}
          {/* API REFERENCE */}
          {/* ═══════════════════════════════════════════════════════════ */}
          <Section id="api">
            <div className="flex flex-col gap-8">
              <H2 id="api-heading">API Reference</H2>
              <P>
                All API endpoints return JSON and use{" "}
                <code className="font-mono text-sm text-foreground">
                  Cache-Control: no-store
                </code>
                . Errors return{" "}
                <code className="font-mono text-sm text-foreground">
                  {"{ error, message }"}
                </code>
                .
              </P>

              <div className="flex flex-col gap-3">
                <H3 id="api-summaries">GET /api/gallery/summaries</H3>
                <P>
                  Paginated gallery items with server-side filtering and sorting.
                  This is the primary endpoint for browsing the gallery.
                </P>
                <CodeBlock>{`GET /api/gallery/summaries?q=react&role=Developer&sort=quality&pageSize=10

Response: {
  "items": [GalleryItemSummary, ...],
  "total": 42,
  "page": 1,
  "pageSize": 10
}`}</CodeBlock>
              </div>

              <div className="flex flex-col gap-3">
                <H3 id="api-facets">GET /api/gallery/facets</H3>
                <P>
                  Facet counts for building filter UIs. Returns counts for roles,
                  styles, stacks, qualities, consents, and total portfolio count.
                </P>
                <CodeBlock>{`GET /api/gallery/facets

Response: {
  "facets": {
    "total": 42,
    "roles": [{ "value": "Designer", "count": 15 }, ...],
    "styles": [{ "value": "minimal", "count": 8 }, ...],
    "stacks": [{ "value": "React", "count": 12 }, ...],
    "qualities": [{ "value": "L3", "count": 10 }, ...],
    "consents": [{ "value": "FULL", "count": 30 }, ...]
  }
}`}</CodeBlock>
              </div>

              <div className="flex flex-col gap-3">
                <H3 id="api-random">GET /api/gallery/random</H3>
                <P>
                  Returns a random accepted portfolio ID. Use this for discovery
                  features or &ldquo;surprise me&rdquo; buttons.
                </P>
                <CodeBlock>{`GET /api/gallery/random

Response: { "id": "clx..." }

// 404 if no accepted portfolios exist
// 500 if gallery is unavailable`}</CodeBlock>
              </div>

              <div className="flex flex-col gap-3">
                <H3 id="api-detail">GET /api/gallery/items/[id]</H3>
                <P>
                  Full portfolio detail for a specific item. Includes sections,
                  strengths, stack evidence, and all metadata.
                </P>
                <CodeBlock>{`GET /api/gallery/items/clx...

Response: {
  "id": "clx...",
  "title": "Portfolio Title",
  "creatorRole": "Front-end Developer",
  "sections": [...],
  "strengths": [...],
  "stackEvidence": [...],
  ...
}`}</CodeBlock>
              </div>

              <div className="flex flex-col gap-3">
                <H3 id="api-params">Query parameters</H3>
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
                        ["role", "string[]", "Filter by creator role (repeatable)"],
                        ["style", "string[]", "Filter by style tags (repeatable)"],
                        ["stack", "string[]", "Filter by stack tags (repeatable)"],
                        ["quality", "string[]", "Filter by quality level L0-L4 (repeatable)"],
                        ["consent", "string[]", "Filter by consent tier (repeatable)"],
                        ["sort", "string", "Sort: newest | title-asc | title-desc | quality"],
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
              </div>

              <div className="flex flex-col gap-3">
                <H3 id="api-response">Response shape</H3>
                <CodeBlock>{`// GalleryItemSummary (returned in /summaries responses)
{
  "id": "clx...",
  "title": "Portfolio Title",
  "creatorRole": "Front-end Developer",
  "styleTags": ["minimal", "editorial"],
  "qualityLevel": "L3",
  "complianceStatus": "PASS",
  "status": "ACCEPTED",
  "attribution": {
    "creatorName": "Jane Doe",
    "sourceUrl": "https://janedoe.com",
    "licenseType": "DISPLAY",
    "consentDate": "2025-01-15T00:00:00.000Z"
  },
  "consentTier": "FULL",
  "reviewedAt": "2025-01-20T00:00:00.000Z",
  "mediaUrl": "https://...",
  "githubUrl": "https://github.com/...",
  "stackTags": ["React", "TypeScript", "Tailwind"]
}`}</CodeBlock>
              </div>
            </div>
          </Section>
        </div>

        {/* Footer nav */}
        <nav className="mt-16 flex flex-col gap-4 rounded-xl border border-border bg-card p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1">
            <p className="font-display text-base font-semibold text-foreground">
              Ready to explore?
            </p>
            <P>Browse the gallery or discover a random portfolio.</P>
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
    </div>
  );
}
