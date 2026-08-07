import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { ThemeProvider } from "@/lib/theme";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FolioMuse",
  description:
    "Build a portfolio that is genuinely your own - informed by real examples, sharpened by AI feedback, assembled with an AI agent.",
};

/**
 * Sets the theme class before first paint to prevent a flash of the wrong
 * color scheme. Must stay in sync with `applyTheme` in src/lib/theme.tsx.
 */
const themeScript = `(function () {
  try {
    var stored = localStorage.getItem("foliomuse-theme");
    var dark =
      stored === "dark" ||
      ((!stored || stored === "system") &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", dark);
  } catch (e) {}
})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      // The inline theme script adds/removes the `dark` class on <html>
      // before React hydrates, so the client DOM className intentionally
      // differs from the server-rendered one. suppressHydrationWarning is
      // the documented escape hatch for this exact theme-script pattern
      // (React's warning here is a false positive — the class is applied
      // deliberately before paint to avoid a flash of the wrong theme).
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full flex flex-col">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
