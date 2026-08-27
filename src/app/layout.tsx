import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { NavBar } from "@/components/ui/tubelight-navbar";
import { ThemeToggle } from "@/components/theme-toggle";
import { ThemeProvider } from "@/lib/theme";
import { SiteBackdrop } from "@/components/site-backdrop";

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
  metadataBase: new URL("https://foliomuse.com"),
  openGraph: {
    title: "FolioMuse - Portfolio inspiration, without the cloning",
    description:
      "Build a portfolio that is genuinely your own - informed by real examples, sharpened by AI feedback, assembled with an AI agent.",
    url: "https://foliomuse.com",
    siteName: "FolioMuse",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "FolioMuse - Portfolio inspiration, without the cloning",
    description:
      "Build a portfolio that is genuinely your own - informed by real examples, sharpened by AI feedback, assembled with an AI agent.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
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
        <ThemeProvider>
          <SiteBackdrop />
          {/* Spacer so the fixed pill never overlaps content on desktop. */}
          <div aria-hidden className="h-16 sm:h-14" />
          {/* Nav items (with lucide icon components) live inside the client
              module — functions cannot cross the server->client boundary. */}
          <NavBar
            rightSlot={
              <span className="inline-flex">
                <ThemeToggle />
              </span>
            }
          />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
