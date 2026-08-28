"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Plus,
  Trash2,
  GripVertical,
  Sparkles,
  Eye,
  Save,
  Download,
} from "lucide-react";

interface Section {
  id: string;
  type: string;
  title: string;
  content: string;
}

const SECTION_TYPES = [
  { value: "hero", label: "Hero" },
  { value: "about", label: "About" },
  { value: "project grid", label: "Projects" },
  { value: "timeline", label: "Timeline" },
  { value: "testimonial", label: "Testimonial" },
  { value: "contact CTA", label: "Contact" },
  { value: "stats", label: "Stats" },
  { value: "gallery", label: "Gallery" },
];

export function PortfolioBuilder() {
  const [sections, setSections] = useState<Section[]>([
    { id: "1", type: "hero", title: "Hero Section", content: "" },
  ]);
  const [activeId, setActiveId] = useState<string>("1");
  const [aiLoading, setAiLoading] = useState(false);
  const [preview, setPreview] = useState(false);

  const activeSection = sections.find((s) => s.id === activeId);

  function addSection() {
    const newSection: Section = {
      id: crypto.randomUUID(),
      type: "about",
      title: "New Section",
      content: "",
    };
    setSections([...sections, newSection]);
    setActiveId(newSection.id);
  }

  function removeSection(id: string) {
    const filtered = sections.filter((s) => s.id !== id);
    setSections(filtered);
    if (activeId === id && filtered.length > 0) {
      setActiveId(filtered[0].id);
    }
  }

  function updateSection(id: string, updates: Partial<Section>) {
    setSections(sections.map((s) => (s.id === id ? { ...s, ...updates } : s)));
  }

  async function getAiSuggestion() {
    if (!activeSection || aiLoading) return;
    setAiLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            {
              role: "user",
              content: `I'm building a portfolio. Help me write content for my ${activeSection.type} section.

Current title: "${activeSection.title}"
Current content: "${activeSection.content || "Empty"}"

Provide:
1. A suggested title (if current is generic)
2. 2-3 paragraphs of content
3. Tips for making this section effective

Keep it professional but personal. Don't use placeholder text.`,
            },
          ],
        }),
      });

      const data = await res.json();
      if (data.content) {
        updateSection(activeId, { content: data.content });
      }
    } catch {
      // ponytail: fail silently
    } finally {
      setAiLoading(false);
    }
  }

  function exportPortfolio() {
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>My Portfolio</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: system-ui, sans-serif; line-height: 1.6; }
    section { padding: 4rem 2rem; max-width: 800px; margin: 0 auto; }
    h1 { font-size: 2.5rem; margin-bottom: 1rem; }
    h2 { font-size: 1.5rem; margin-bottom: 0.5rem; }
    p { margin-bottom: 1rem; }
  </style>
</head>
<body>
${sections
  .map(
    (s) => `  <section id="${s.type}">
    <h2>${s.title}</h2>
    <p>${s.content.replace(/\n/g, "</p><p>")}</p>
  </section>`
  )
  .join("\n")}
</body>
</html>`;

    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "portfolio.html";
    a.click();
    URL.revokeObjectURL(url);
  }

  if (preview) {
    return (
      <div className="relative">
        <button
          type="button"
          onClick={() => setPreview(false)}
          className="fixed bottom-4 right-4 z-50 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-lg"
        >
          Back to Editor
        </button>
        <div className="mx-auto max-w-3xl space-y-8 p-8">
          {sections.map((section) => (
            <div key={section.id} className="rounded-lg border border-border p-6">
              <h2 className="font-display text-xl font-semibold">{section.title}</h2>
              <p className="mt-2 whitespace-pre-wrap text-muted-foreground">
                {section.content || "No content yet"}
              </p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
      {/* Sidebar — Section list */}
      <div className="flex flex-col gap-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="mb-3 text-sm font-medium">Sections</h3>
          <div className="flex flex-col gap-2">
            {sections.map((section) => (
              <button
                key={section.id}
                type="button"
                onClick={() => setActiveId(section.id)}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                  activeId === section.id
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                <GripVertical className="h-4 w-4 opacity-50" />
                <span className="flex-1 truncate">{section.title}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeSection(section.id);
                  }}
                  className="rounded p-1 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={addSection}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border p-2 text-sm text-muted-foreground hover:border-ring hover:text-foreground"
          >
            <Plus className="h-4 w-4" />
            Add Section
          </button>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => setPreview(true)}
            className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium transition-colors hover:bg-muted"
          >
            <Eye className="h-4 w-4" />
            Preview
          </button>
          <button
            type="button"
            onClick={exportPortfolio}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Download className="h-4 w-4" />
            Export HTML
          </button>
        </div>
      </div>

      {/* Editor */}
      {activeSection ? (
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg font-semibold">Edit Section</h3>
            <button
              type="button"
              onClick={getAiSuggestion}
              disabled={aiLoading}
              className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20 disabled:opacity-50"
            >
              {aiLoading ? (
                <>
                  <div className="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-3 w-3" />
                  AI Suggest
                </>
              )}
            </button>
          </div>

          <div className="mt-4 flex flex-col gap-4">
            <div>
              <label htmlFor="section-type" className="mb-1.5 block text-sm font-medium">
                Type
              </label>
              <select
                id="section-type"
                value={activeSection.type}
                onChange={(e) =>
                  updateSection(activeId, { type: e.target.value })
                }
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
              >
                {SECTION_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="section-title" className="mb-1.5 block text-sm font-medium">
                Title
              </label>
              <input
                id="section-title"
                type="text"
                value={activeSection.title}
                onChange={(e) =>
                  updateSection(activeId, { title: e.target.value })
                }
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            <div>
              <label htmlFor="section-content" className="mb-1.5 block text-sm font-medium">
                Content
              </label>
              <textarea
                id="section-content"
                value={activeSection.content}
                onChange={(e) =>
                  updateSection(activeId, { content: e.target.value })
                }
                rows={12}
                placeholder="Write your content here, or use AI Suggest..."
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="flex h-64 items-center justify-center rounded-xl border border-border bg-card">
          <p className="text-muted-foreground">Add a section to start editing</p>
        </div>
      )}
    </div>
  );
}
