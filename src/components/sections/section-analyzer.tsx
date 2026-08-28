"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, Send } from "lucide-react";

export function SectionAnalyzer() {
  const [content, setContent] = useState("");
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleAnalyze() {
    if (!content.trim() || loading) return;
    setLoading(true);
    setFeedback("");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            {
              role: "user",
              content: `Analyze this portfolio section and provide specific feedback on:
1. CLARITY - Is the message clear?
2. HIERARCHY - Is the visual hierarchy effective?
3. FOCUS - Does it have a clear focal point?
4. MOTION - Would animations improve it?
5. ACCESSIBILITY - Any a11y concerns?

Section content:
${content}

Provide concise, actionable feedback for each category.`,
            },
          ],
        }),
      });

      const data = await res.json();
      setFeedback(data.content || "No feedback received.");
    } catch {
      setFeedback("Failed to analyze. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
          <Sparkles className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="font-display text-lg font-semibold">Section Analyzer</h3>
          <p className="text-sm text-muted-foreground">
            Paste your section HTML/content to get AI feedback
          </p>
        </div>
      </div>

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Paste your section HTML, JSX, or describe your section layout here..."
        className="min-h-[120px] w-full rounded-lg border border-border bg-background p-3 text-sm placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
      />

      <button
        type="button"
        onClick={handleAnalyze}
        disabled={!content.trim() || loading}
        className="mt-3 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <>
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
            Analyzing...
          </>
        ) : (
          <>
            <Send className="h-4 w-4" />
            Analyze Section
          </>
        )}
      </button>

      {feedback && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 rounded-lg bg-muted/50 p-4"
        >
          <pre className="whitespace-pre-wrap text-sm leading-relaxed">
            {feedback}
          </pre>
        </motion.div>
      )}
    </div>
  );
}
