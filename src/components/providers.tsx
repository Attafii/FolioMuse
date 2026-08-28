"use client";

import { CollectionsProvider } from "@/lib/collections";

export function Providers({ children }: { children: React.ReactNode }) {
  return <CollectionsProvider>{children}</CollectionsProvider>;
}
