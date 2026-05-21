import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "deplo.ai — AI-Powered Deployment Orchestration",
  description:
    "Connect your GitHub repo. deplo.ai detects your stack, deploys frontend to Vercel, backend to Render, syncs environment variables, and returns production-ready URLs automatically.",
  keywords:
    "deployment automation, AI DevOps, GitHub deployment, Vercel, Render, fullstack deployment, CI/CD",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/logo.png", type: "image/png" },
    ],
    apple: "/logo.png",
    shortcut: "/favicon.ico",
  },
  openGraph: {
    title: "deplo.ai — Code goes in. Production URL comes out.",
    description:
      "AI-powered deployment orchestration. Connect GitHub, get production URLs.",
    type: "website",
    images: [{ url: "/logo.png", width: 512, height: 512, alt: "deplo.ai" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "deplo.ai — AI-Powered Deployment Orchestration",
    description: "Connect GitHub. Get production URLs.",
    images: ["/logo.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-white text-black">
        {children}
      </body>
    </html>
  );
}
