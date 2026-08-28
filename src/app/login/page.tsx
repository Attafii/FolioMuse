import type { Metadata } from "next";

import { LoginPage } from "@/components/auth-pages";

export const metadata: Metadata = {
  title: "Sign in — FolioMuse",
  description: "Sign in to your FolioMuse account.",
};

export default function LoginRoute() {
  return <LoginPage />;
}
