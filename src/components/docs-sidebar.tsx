"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Docs sidebar with scroll spy.
 *
 * Highlights the currently visible section as the user scrolls.
 * Uses IntersectionObserver for efficient scroll detection.
 * Collapsible on mobile via a toggle button.
 */

export interface DocNavItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  children?: { id: string; label: string }[];
}

interface DocsSidebarProps {
  items: DocNavItem[];
}

export function DocsSidebar({ items }: DocsSidebarProps) {
  const [activeId, setActiveId] = useState<string>("");
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const headings = items.flatMap((item) => {
      const el = document.getElementById(item.id);
      const childEls = item.children?.map((c) => document.getElementById(c.id)).filter(Boolean) ?? [];
      return [el, ...childEls].filter(Boolean) as Element[];
    });

    if (headings.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        }
      },
      {
        rootMargin: "-80px 0px -70% 0px",
        threshold: 0,
      },
    );

    for (const el of headings) {
      observer.observe(el);
    }

    return () => observer.disconnect();
  }, [items]);

  function handleClick(id: string) {
    setActiveId(id);
    setMobileOpen(false);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  return (
    <>
      {/* Mobile toggle */}
      <button
        type="button"
        onClick={() => setMobileOpen(!mobileOpen)}
        className="fixed bottom-20 right-4 z-50 flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card shadow-lg lg:hidden"
        aria-label={mobileOpen ? "Close docs navigation" : "Open docs navigation"}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {mobileOpen ? (
            <>
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </>
          ) : (
            <>
              <line x1="4" y1="6" x2="20" y2="6" />
              <line x1="4" y1="12" x2="16" y2="12" />
              <line x1="4" y1="18" x2="12" y2="18" />
            </>
          )}
        </svg>
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-24 z-40 h-[calc(100vh-6rem)] w-64 overflow-y-auto border-r border-border bg-background/95 backdrop-blur-sm transition-transform duration-300 lg:sticky lg:top-24 lg:h-[calc(100vh-6rem)] lg:translate-x-0 lg:bg-transparent lg:backdrop-blur-none",
          mobileOpen ? "left-0 translate-x-0" : "-left-64 -translate-x-full lg:left-0 lg:translate-x-0",
        )}
      >
        <nav aria-label="Documentation navigation" className="flex flex-col gap-1 p-4">
          <p className="mb-2 font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Documentation
          </p>
          {items.map((item) => (
            <div key={item.id} className="flex flex-col">
              <button
                type="button"
                onClick={() => handleClick(item.id)}
                className={cn(
                  "flex items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors",
                  activeId === item.id
                    ? "bg-primary/10 font-medium text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {item.icon}
                {item.label}
              </button>
              {item.children && (
                <div className="ml-4 flex flex-col gap-0.5 border-l border-border pl-3">
                  {item.children.map((child) => (
                    <button
                      key={child.id}
                      type="button"
                      onClick={() => handleClick(child.id)}
                      className={cn(
                        "rounded-md px-2 py-1.5 text-left text-xs transition-colors",
                        activeId === child.id
                          ? "bg-primary/10 font-medium text-primary"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                    >
                      {child.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}
