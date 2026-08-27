import type { MetadataRoute } from "next";

/**
 * PWA Web App Manifest for FolioMuse.
 *
 * Enables "Add to Home Screen" on mobile devices.
 * Uses the existing icon.svg for the app icon.
 * Theme color matches the dark mode background.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FolioMuse - Portfolio Inspiration Gallery",
    short_name: "FolioMuse",
    description:
      "Build a portfolio that is genuinely your own - informed by real examples, sharpened by AI feedback, assembled with an AI agent.",
    start_url: "/",
    display: "standalone",
    background_color: "#0f0f14",
    theme_color: "#6366f1",
    orientation: "portrait-primary",
    categories: ["design", "productivity", "education"],
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Browse Gallery",
        short_name: "Browse",
        description: "Explore curated portfolio examples",
        url: "/browse",
        icons: [
          {
            src: "/icon.svg",
            sizes: "any",
            type: "image/svg+xml",
          },
        ],
      },
      {
        name: "Documentation",
        short_name: "Docs",
        description: "Learn how FolioMuse works",
        url: "/docs",
        icons: [
          {
            src: "/icon.svg",
            sizes: "any",
            type: "image/svg+xml",
          },
        ],
      },
    ],
  };
}
