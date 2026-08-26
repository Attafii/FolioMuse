import type { Metadata } from "next";

import { LikedPageClient } from "@/components/liked/liked-page-client";

export const metadata: Metadata = {
  title: "Liked portfolios - FolioMuse",
  description: "Your saved and preferred portfolio references.",
};

/**
 * /liked — the user's liked portfolios (like-button feature).
 *
 * Server shell + client island: likes live in the SSR-safe local bookmark
 * store (ADR-0006 D4, per-browser with cross-tab sync until accounts exist),
 * so the list itself must render on the client.
 */
export default function LikedPage() {
  return <LikedPageClient />;
}
