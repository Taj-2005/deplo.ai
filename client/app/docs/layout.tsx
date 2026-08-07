import type { Metadata } from "next";
import { DocsShell } from "@/components/docs/DocsShell";

export const metadata: Metadata = {
  title: {
    default: "Documentation",
    template: "%s — deplo.ai Docs",
  },
  description:
    "deplo.ai documentation — deploy full-stack apps into your own Vercel and Render accounts. Guides, CLI reference, API reference, and architecture.",
};

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return <DocsShell>{children}</DocsShell>;
}
