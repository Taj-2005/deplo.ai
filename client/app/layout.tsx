import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { StructuredData } from "@/components/seo/StructuredData";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
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

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#000000",
  colorScheme: "light dark",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://www.deplo.in"),

  title: {
    default: "deplo.ai — AI-Powered Deployment Orchestration",
    template: "%s | deplo.ai",
  },

  description:
    "Connect your GitHub repo and get production-ready URLs in under 3 minutes. deplo.ai detects your stack, deploys frontend to Vercel and backend to Render, and syncs environment variables automatically — no DevOps expertise required.",

  keywords: [
    "AI deployment platform",
    "AI DevOps platform",
    "GitHub deployment automation",
    "deploy apps without DevOps",
    "Vercel Render deployment",
    "automatic app deployment",
    "frontend backend deployment automation",
    "deployment orchestration platform",
    "developer infrastructure tools",
    "deployment pipeline automation",
    "fullstack deployment",
    "zero config deployment",
    "GitHub to production",
    "indie hacker tools",
    "startup deployment",
  ],

  authors: [{ name: "deplo.ai", url: "https://www.deplo.in" }],
  creator: "deplo.ai",
  publisher: "deplo.ai",
  applicationName: "deplo.ai",
  category: "Developer Tools",

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },

  openGraph: {
    type: "website",
    url: "https://www.deplo.in",
    siteName: "deplo.ai",
    title: "Code goes in. Production URL comes out.",
    description:
      "deplo.ai connects your GitHub repo, detects your stack, deploys frontend to Vercel and backend to Render, syncs environment variables — and returns production-ready URLs in under 3 minutes.",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "deplo.ai — AI-Powered Deployment Orchestration",
        type: "image/png",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    site: "@deploai",
    creator: "@deploai",
    title: "deplo.ai — AI-Powered Deployment Orchestration",
    description:
      "Connect GitHub. Get production URLs. deplo.ai deploys frontend to Vercel and backend to Render automatically — zero DevOps needed.",
    images: ["/og.png"],
  },

  alternates: {
    canonical: "https://www.deplo.in",
  },

  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/favicon.ico",
  },

  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "deplo.ai",
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
      suppressHydrationWarning
    >
      {/* Anti-flash: apply saved theme class before first paint */}
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('deplo_theme');if(t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme:dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}})()`,
          }}
        />
      </head>
      <body
        className="min-h-full flex flex-col bg-white text-black"
        suppressHydrationWarning
      >
        <StructuredData />
        <ThemeProvider>
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
