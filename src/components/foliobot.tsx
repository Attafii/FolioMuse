"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Send, X, Bot, User, Loader2, ExternalLink, Star, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Foliobot — AI chat assistant for FolioMuse.
 *
 * Floating chat widget in the bottom-right corner. Helps users understand
 * the app and acts as a RAG agent to find compatible portfolios based on
 * user specifications.
 *
 * Features:
 * - Chat with AI assistant powered by OpenRouter
 * - RAG-based portfolio search when user describes requirements
 * - Portfolio cards with images, star ratings, and links
 * - Keyboard accessible, respects prefers-reduced-motion
 */

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  portfolios?: PortfolioMatch[];
  timestamp: Date;
}

interface PortfolioMatch {
  id: string;
  title: string;
  creatorName: string;
  creatorRole: string;
  qualityLevel: string;
  stars: number;
  starString: string;
  mediaUrl: string | null;
  sourceUrl: string;
  stackTags: string[];
  styleTags: string[];
  matchReason: string;
}

const SUGGESTED_QUESTIONS = [
  "What is FolioMuse?",
  "Find me a minimal React portfolio",
  "Show me design portfolios with dark themes",
  "Show me the best portfolios",
  "How does the AI rating work?",
];

export function Foliobot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: content.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response");
      }

      const data = await response.json();

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: data.content,
        portfolios: data.portfolios,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch {
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: "assistant",
        content:
          "Sorry, I encountered an error. Please make sure the OpenRouter API key is configured and try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [messages, isLoading]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      sendMessage(input);
    },
    [input, sendMessage],
  );

  const handleSuggestion = useCallback(
    (question: string) => {
      sendMessage(question);
    },
    [sendMessage],
  );

  return (
    <>
      {/* Chat toggle button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? "Close chat" : "Open Foliobot assistant"}
        className={cn(
          "fixed bottom-6 right-6 z-[var(--z-modal)] flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-all duration-300 ease-[var(--ease-standard)] hover:scale-105 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          isOpen && "rotate-90",
        )}
      >
        {isOpen ? (
          <X className="size-6" />
        ) : (
          <MessageCircle className="size-6" />
        )}
      </button>

      {/* Chat panel */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="Foliobot chat assistant"
          className="fixed bottom-24 right-6 z-[var(--z-modal)] flex h-[600px] w-[420px] flex-col overflow-hidden rounded-2xl border border-border/60 bg-card shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center gap-3 border-b border-border/60 bg-muted/50 px-4 py-3">
            <div className="flex size-8 items-center justify-center rounded-full bg-primary/10">
              <Bot className="size-4 text-primary" />
            </div>
            <div className="flex-1">
              <h2 className="font-display text-sm font-semibold tracking-tight">
                Foliobot
              </h2>
              <p className="font-mono text-[10px] text-muted-foreground">
                AI portfolio assistant
              </p>
            </div>
            <div className="flex items-center gap-1">
              <span className="size-2 rounded-full bg-green-500" />
              <span className="font-mono text-[10px] text-muted-foreground">
                Online
              </span>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center gap-4 py-8">
                <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
                  <Bot className="size-6 text-primary" />
                </div>
                <div className="text-center">
                  <h3 className="font-display text-base font-semibold">
                    Welcome to Foliobot!
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    I can help you find the perfect portfolio inspiration.
                    Ask me anything or try a suggestion below.
                  </p>
                </div>
                <div className="flex w-full flex-col gap-2">
                  {SUGGESTED_QUESTIONS.map((question) => (
                    <button
                      key={question}
                      type="button"
                      onClick={() => handleSuggestion(question)}
                      className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {question}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      "flex gap-2",
                      message.role === "user" ? "justify-end" : "justify-start",
                    )}
                  >
                    {message.role === "assistant" && (
                      <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
                        <Bot className="size-3.5 text-primary" />
                      </div>
                    )}
                    <div
                      className={cn(
                        "max-w-[85%] rounded-2xl px-4 py-2.5",
                        message.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted",
                      )}
                    >
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>

                      {/* Portfolio cards */}
                      {message.portfolios && message.portfolios.length > 0 && (
                        <div className="mt-3 flex flex-col gap-3">
                          <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                            Recommended portfolios ({message.portfolios.length})
                          </p>
                          {message.portfolios.map((portfolio) => (
                            <a
                              key={portfolio.id}
                              href={`/gallery/${portfolio.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="group flex flex-col overflow-hidden rounded-xl border border-border/60 bg-card transition-all hover:border-primary/50 hover:shadow-md"
                            >
                              {/* Portfolio image */}
                              {portfolio.mediaUrl && (
                                <div className="relative aspect-[16/10] overflow-hidden bg-muted">
                                  <img
                                    src={portfolio.mediaUrl}
                                    alt={portfolio.title}
                                    loading="lazy"
                                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).style.display = "none";
                                    }}
                                  />
                                </div>
                              )}

                              {/* Portfolio info */}
                              <div className="flex flex-col gap-2 p-3">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0 flex-1">
                                    <h4 className="truncate font-display text-sm font-semibold tracking-tight">
                                      {portfolio.title}
                                    </h4>
                                    <p className="truncate font-mono text-[11px] text-muted-foreground">
                                      {portfolio.creatorName} · {portfolio.creatorRole}
                                    </p>
                                  </div>
                                  <ExternalLink className="size-3.5 shrink-0 text-muted-foreground" />
                                </div>

                                {/* Star rating */}
                                <div className="flex items-center gap-1.5">
                                  <div className="flex items-center gap-0.5">
                                    {Array.from({ length: 5 }).map((_, i) => (
                                      <Star
                                        key={i}
                                        className={cn(
                                          "size-3",
                                          i < portfolio.stars
                                            ? "fill-amber-400 text-amber-400"
                                            : "fill-transparent text-muted-foreground/30"
                                        )}
                                      />
                                    ))}
                                  </div>
                                  <span className="font-mono text-[10px] text-muted-foreground">
                                    {portfolio.stars}/5
                                  </span>
                                </div>

                                {/* Stack tags */}
                                {portfolio.stackTags.length > 0 && (
                                  <div className="flex flex-wrap gap-1">
                                    {portfolio.stackTags.slice(0, 3).map((tag) => (
                                      <span
                                        key={tag}
                                        className="rounded-full bg-muted px-2 py-0.5 font-mono text-[10px] text-muted-foreground"
                                      >
                                        {tag}
                                      </span>
                                    ))}
                                  </div>
                                )}

                                {/* Match reason */}
                                <p className="text-[11px] text-muted-foreground">
                                  {portfolio.matchReason}
                                </p>
                              </div>
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                    {message.role === "user" && (
                      <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary">
                        <User className="size-3.5 text-primary-foreground" />
                      </div>
                    )}
                  </div>
                ))}
                {isLoading && (
                  <div className="flex gap-2">
                    <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <Bot className="size-3.5 text-primary" />
                    </div>
                    <div className="rounded-2xl bg-muted px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Loader2 className="size-4 animate-spin text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Searching portfolios...</span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Input */}
          <form
            onSubmit={handleSubmit}
            className="flex items-center gap-2 border-t border-border/60 p-3"
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about portfolios..."
              disabled={isLoading}
              className="flex-1 rounded-lg border border-border/60 bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              aria-label="Send message"
              className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
            </button>
          </form>
        </div>
      )}
    </>
  );
}
