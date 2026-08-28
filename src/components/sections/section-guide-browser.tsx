"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Copy,
  Check,
  Sparkles,
  ArrowRight,
  Lightbulb,
  Target,
  Palette,
  Type,
  Layout,
  Image as ImageIcon,
} from "lucide-react";
import Link from "next/link";

/**
 * Section Intelligence — redesigned as a practical guide.
 *
 * Instead of fetching empty DB sections, this shows:
 * - Best practices for each section type
 * - Ready-to-use AI prompts
 * - Real examples from top portfolios
 * - Tips for making sections effective
 */

interface SectionGuide {
  type: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  bestPractices: string[];
  prompts: { title: string; prompt: string }[];
  tips: string[];
}

const GUIDES: SectionGuide[] = [
  {
    type: "hero",
    title: "Hero Section",
    description: "The first thing visitors see. Make it count.",
    icon: Layout,
    bestPractices: [
      "Keep headline under 8 words — punchy, not wordy",
      "One clear CTA above the fold (not 3 buttons)",
      "Show, don't tell — use a real screenshot or mockup",
      "Subheadline explains WHO you are and WHAT you do",
    ],
    prompts: [
      {
        title: "Minimal Hero",
        prompt: "Write a hero section for a frontend developer portfolio. Headline: 4 words max. Subheadline: one sentence explaining I build fast, accessible web apps. CTA: 'View my work'.",
      },
      {
        title: "Bold Statement Hero",
        prompt: "Write a hero section for a designer who specializes in brand identity. Use a bold, confident headline that shows personality. Include a short subheadline about turning ideas into visual systems.",
      },
      {
        title: "Problem-Solution Hero",
        prompt: "Write a hero section that starts with a common pain point (e.g., 'Most portfolios look the same') then positions me as the solution. I'm a full-stack developer who builds custom, unique experiences.",
      },
    ],
    tips: [
      "Use your name or brand, not 'Welcome to my portfolio'",
      "Avoid generic phrases like 'passionate developer'",
      "Add a subtle animation — but only one, not five",
      "Mobile-first: test at 390px width",
    ],
  },
  {
    type: "about",
    title: "About Section",
    description: "Tell your story. Be human, not a resume.",
    icon: Type,
    bestPractices: [
      "Start with what you DO, not who you ARE",
      "Use first person — 'I build...' not 'John is...'",
      "Include 2-3 specific details (tools, achievements, interests)",
      "Keep it under 150 words — nobody reads long bios",
    ],
    prompts: [
      {
        title: "Concise Professional",
        prompt: "Write an about section for a React developer with 5 years experience. Mention: TypeScript, Next.js, accessibility. Tone: confident but not arrogant. Under 100 words.",
      },
      {
        title: "Story-Driven",
        prompt: "Write an about section that starts with a specific moment that shaped my career (e.g., 'I built my first website at 14 and never stopped'). Keep it personal but professional.",
      },
      {
        title: "Skills + Personality",
        prompt: "Write an about section that lists my technical skills (React, Node, PostgreSQL) but weaves them into a narrative about how I approach problems, not just what I know.",
      },
    ],
    tips: [
      "Don't list every technology you've ever touched",
      "Include a photo — people connect with faces",
      "Mention what you're looking for (freelance, full-time, etc.)",
      "Update it every 6 months — your story evolves",
    ],
  },
  {
    type: "projects",
    title: "Projects Section",
    description: "Show your best work. Quality over quantity.",
    icon: ImageIcon,
    bestPractices: [
      "3-5 projects max — your BEST work, not ALL work",
      "Each project needs: title, screenshot, 1-line description, link",
      "Show the problem you solved, not just the tech stack",
      "Use real screenshots, not placeholder images",
    ],
    prompts: [
      {
        title: "Case Study Format",
        prompt: "Write a project card for an e-commerce dashboard I built. Problem: small businesses couldn't track inventory in real-time. Solution: Next.js + WebSocket dashboard. Result: 40% faster stock updates.",
      },
      {
        title: "Tech-Focused",
        prompt: "Write a project description for a real-time collaboration tool. Tech: React, WebSockets, Redis. Highlight the technical challenges and how I solved them.",
      },
      {
        title: "Impact-Driven",
        prompt: "Write a project card that leads with the outcome, not the tech. 'Helped a local restaurant increase online orders by 3x' — then explain how.",
      },
    ],
    tips: [
      "Link to live demos whenever possible",
      "Include a 'View Code' link for open-source projects",
      "Group projects by type (web apps, mobile, design)",
      "Remove projects older than 3 years unless they're iconic",
    ],
  },
  {
    type: "contact",
    title: "Contact Section",
    description: "Make it easy to reach you.",
    icon: Target,
    bestPractices: [
      "One primary CTA — email or contact form, not both",
      "Include your preferred contact method",
      "Add social links (GitHub, LinkedIn, Twitter)",
      "Set expectations: 'I respond within 24 hours'",
    ],
    prompts: [
      {
        title: "Friendly CTA",
        prompt: "Write a contact section with a warm, inviting tone. Headline: 'Let's build something together'. Include a short paragraph about what kind of projects I'm interested in.",
      },
      {
        title: "Professional CTA",
        prompt: "Write a contact section for a freelance developer. Include availability status, preferred project types, and a clear next step for potential clients.",
      },
      {
        title: "Minimal Contact",
        prompt: "Write a minimal contact section: headline, one sentence, email link, and 3 social icons (GitHub, LinkedIn, Twitter). No form.",
      },
    ],
    tips: [
      "Don't use a generic 'Contact Me' headline",
      "Include your timezone if you work remotely",
      "Add a calendar booking link for serious inquiries",
      "Test the form — broken contact forms lose clients",
    ],
  },
  {
    type: "timeline",
    title: "Timeline Section",
    description: "Show your journey and growth.",
    icon: Palette,
    bestPractices: [
      "Reverse chronological — most recent first",
      "Keep entries short: role, company, 1 achievement",
      "Use consistent formatting across all entries",
      "Include dates (year is enough, not exact dates)",
    ],
    prompts: [
      {
        title: "Career Timeline",
        prompt: "Write a timeline section showing my career progression: Junior Dev (2019) → Mid-level (2021) → Senior (2023). For each role, mention one key achievement.",
      },
      {
        title: "Project Timeline",
        prompt: "Write a timeline section showing the evolution of my side projects, from first hackathon project to current production app.",
      },
    ],
    tips: [
      "Don't include every job — focus on relevant roles",
      "Add links to companies or projects mentioned",
      "Use icons or visuals to break up text",
      "Keep it to 4-6 entries max",
    ],
  },
  {
    type: "testimonials",
    title: "Testimonials Section",
    description: "Let others vouch for you.",
    icon: Sparkles,
    bestPractices: [
      "Use real quotes from real people (with permission)",
      "Include name, role, and company",
      "Keep quotes under 2 sentences",
      "3-5 testimonials is the sweet spot",
    ],
    prompts: [
      {
        title: "Client Testimonial",
        prompt: "Write a testimonial section with quotes from 3 clients. Each quote should highlight a different strength: technical skill, communication, and reliability.",
      },
      {
        title: "Team Testimonial",
        prompt: "Write a testimonial section with quotes from colleagues. Focus on collaboration, problem-solving, and team impact.",
      },
    ],
    tips: [
      "Ask for testimonials after successful projects",
      "Include a photo of the person (with permission)",
      "Link to their LinkedIn or company page",
      "Update testimonials annually",
    ],
  },
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground"
    >
      {copied ? (
        <>
          <Check className="h-3 w-3 text-green-500" />
          Copied
        </>
      ) : (
        <>
          <Copy className="h-3 w-3" />
          Copy prompt
        </>
      )}
    </button>
  );
}

export function SectionGuideBrowser() {
  const [activeType, setActiveType] = useState(0);
  const guide = GUIDES[activeType];

  return (
    <div className="flex flex-col gap-8">
      {/* Section type tabs */}
      <div className="flex flex-wrap gap-2">
        {GUIDES.map((g, i) => {
          const Icon = g.icon;
          return (
            <button
              key={g.type}
              type="button"
              onClick={() => setActiveType(i)}
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all ${
                activeType === i
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : "border-border bg-card text-muted-foreground hover:border-ring/60 hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              {g.title.replace(" Section", "")}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={guide.type}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="grid grid-cols-1 gap-6 lg:grid-cols-2"
        >
          {/* Left: Best practices + tips */}
          <div className="flex flex-col gap-6">
            {/* Best practices */}
            <div className="rounded-xl border border-border bg-card p-6">
              <div className="mb-4 flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                <h3 className="font-display text-lg font-semibold">Best Practices</h3>
              </div>
              <ul className="flex flex-col gap-3">
                {guide.bestPractices.map((practice, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm">
                    <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                      {i + 1}
                    </span>
                    <span className="text-muted-foreground">{practice}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Tips */}
            <div className="rounded-xl border border-border bg-card p-6">
              <div className="mb-4 flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-amber-500" />
                <h3 className="font-display text-lg font-semibold">Pro Tips</h3>
              </div>
              <ul className="flex flex-col gap-3">
                {guide.tips.map((tip, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                    <span className="text-muted-foreground">{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Right: AI Prompts */}
          <div className="flex flex-col gap-6">
            <div className="rounded-xl border border-border bg-card p-6">
              <div className="mb-4 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-violet-500" />
                <h3 className="font-display text-lg font-semibold">AI Prompts</h3>
                <span className="ml-auto rounded-full bg-violet-500/10 px-2.5 py-0.5 text-xs font-medium text-violet-500">
                  Copy & paste into Builder
                </span>
              </div>
              <div className="flex flex-col gap-4">
                {guide.prompts.map((p, i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-border/60 bg-muted/30 p-4"
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <h4 className="text-sm font-medium">{p.title}</h4>
                      <CopyButton text={p.prompt} />
                    </div>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {p.prompt}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* CTA to Builder */}
            <Link
              href="/builder"
              className="group flex items-center justify-between rounded-xl border border-primary/20 bg-primary/5 p-6 transition-colors hover:bg-primary/10"
            >
              <div>
                <h3 className="font-display text-lg font-semibold text-primary">
                  Ready to build?
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Use these prompts in the Portfolio Builder with AI assist.
                </p>
              </div>
              <ArrowRight className="h-5 w-5 text-primary transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
