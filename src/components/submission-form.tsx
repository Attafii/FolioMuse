"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Send, CheckCircle, ExternalLink } from "lucide-react";

export function SubmissionForm() {
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, creatorName: name, creatorRole: role, email, notes }),
      });

      const data = await res.json();

      if (data.success) {
        setSuccess(true);
        setUrl("");
        setName("");
        setRole("");
        setEmail("");
        setNotes("");
      } else {
        setError(data.error || "Submission failed");
      }
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-xl border border-border bg-card p-8 text-center"
      >
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
          <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
        </div>
        <h3 className="font-display text-xl font-semibold">Portfolio Submitted!</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          We&apos;ll review your submission and add it to the gallery if it meets our quality standards.
        </p>
        <button
          type="button"
          onClick={() => setSuccess(false)}
          className="mt-4 rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground"
        >
          Submit another
        </button>
      </motion.div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-border bg-card p-6">
      <h3 className="font-display text-lg font-semibold mb-4">Submit a Portfolio</h3>

      <div className="flex flex-col gap-4">
        <div>
          <label htmlFor="url" className="mb-1.5 block text-sm font-medium">
            Portfolio URL <span className="text-destructive">*</span>
          </label>
          <div className="relative">
            <ExternalLink className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              id="url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://yoursite.com"
              required
              className="w-full rounded-lg border border-border bg-background py-2.5 pl-10 pr-4 text-sm placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="name" className="mb-1.5 block text-sm font-medium">
              Your Name <span className="text-destructive">*</span>
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Doe"
              required
              className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          <div>
            <label htmlFor="role" className="mb-1.5 block text-sm font-medium">
              Role <span className="text-destructive">*</span>
            </label>
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              required
              className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">Select role</option>
              <option value="Designer">Designer</option>
              <option value="Frontend">Frontend Developer</option>
              <option value="Full Stack">Full Stack Developer</option>
              <option value="Backend">Backend Developer</option>
              <option value="AI/ML">AI/ML Engineer</option>
              <option value="Mobile">Mobile Developer</option>
              <option value="DevOps">DevOps Engineer</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-medium">
            Email (optional)
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="jane@example.com"
            className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        <div>
          <label htmlFor="notes" className="mb-1.5 block text-sm font-medium">
            Notes (optional)
          </label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Anything special about this portfolio?"
            rows={3}
            className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
              Submitting...
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              Submit Portfolio
            </>
          )}
        </button>
      </div>
    </form>
  );
}
