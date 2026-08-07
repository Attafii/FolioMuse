"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useTheme } from "@/lib/theme";

const emptySubscribe = () => () => {};

/**
 * Hydration guard: returns false during SSR/prerender and the first client
 * render (server snapshot), true after hydration (client snapshot). Lets the
 * toggle render server-identical until mounted — the client useState
 * initializer in ThemeProvider reads localStorage, which would otherwise
 * mismatch the server's "system"→"light" render. No FOUC: the inline layout
 * script already set the <html> class before paint.
 */
function useMounted(): boolean {
  return useSyncExternalStore(emptySubscribe, () => true, () => false);
}

export function ThemeToggle() {
  const { resolvedTheme, toggleTheme } = useTheme();
  const mounted = useMounted();

  const isDark = mounted && resolvedTheme === "dark";

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark ? <Sun aria-hidden /> : <Moon aria-hidden />}
    </Button>
  );
}
