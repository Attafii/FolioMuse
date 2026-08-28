import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { NavBar } from "@/components/ui/tubelight-navbar";
import { ThemeToggle } from "@/components/theme-toggle";
import { ThemeProvider } from "@/lib/theme";
import { SiteBackdrop } from "@/components/site-backdrop";
import { Foliobot } from "@/components/foliobot";
import { Providers } from "@/components/providers";

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
  title: "FolioMuse — Portfolio Inspiration Gallery | 2,000+ Real Portfolios",
  description:
    "Browse 2,000+ real portfolios from designers, developers, and creators. AI-rated, curated, and ready to inspire your next project. Find portfolio examples by role, style, or tech stack.",
  keywords: [
    "portfolio inspiration",
    "portfolio examples",
    "designer portfolio",
    "developer portfolio",
    "web developer portfolio",
    "UX portfolio",
    "frontend portfolio",
    "AI portfolio gallery",
    "portfolio ideas",
    "creative portfolio",
    "best portfolios",
    "portfolio design",
    "FolioMuse",
  ],
  metadataBase: new URL("https://foliomuse.com"),
  openGraph: {
    title: "FolioMuse — Portfolio Inspiration Gallery | 2,000+ Real Portfolios",
    description:
      "Browse 2,000+ real portfolios from designers, developers, and creators. AI-rated, curated, and ready to inspire your next project.",
    url: "https://foliomuse.com",
    siteName: "FolioMuse",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "FolioMuse — Portfolio Inspiration Gallery | 2,000+ Real Portfolios",
    description:
      "Browse 2,000+ real portfolios from designers, developers, and creators. AI-rated, curated, and ready to inspire your next project.",
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
  alternates: {
    canonical: "https://foliomuse.com",
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "FolioMuse",
              url: "https://foliomuse.com",
              description: "Browse 2,000+ real portfolios from designers, developers, and creators. AI-rated, curated, and ready to inspire your next project.",
              potentialAction: {
                "@type": "SearchAction",
                target: "https://foliomuse.com/browse?q={search_term_string}",
                "query-input": "required name=search_term_string",
              },
              sameAs: [
                "https://github.com/Attafii/FolioMuse",
              ],
            }),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "FolioMuse",
              url: "https://foliomuse.com",
              logo: "https://foliomuse.com/icon.svg",
              description: "Portfolio inspiration gallery with 2,000+ AI-rated portfolios from designers, developers, and creators.",
            }),
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <Providers>
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
            <Foliobot />
          </ThemeProvider>
        </Providers>
      </body>
    </html>
  );
}
