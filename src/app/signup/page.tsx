import type { Metadata } from "next";

import { SignupPage } from "@/components/auth-pages";

export const metadata: Metadata = {
  title: "Create account — FolioMuse",
  description: "Create your FolioMuse account.",
};

export default function SignupRoute() {
  return <SignupPage />;
}
