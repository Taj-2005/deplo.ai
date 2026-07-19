const softwareApplication = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "deplo.ai",
  applicationCategory: "DeveloperApplication",
  operatingSystem: "Web",
  description:
    "AI-powered deployment orchestration platform. Connect your GitHub repo and deplo.ai detects your stack, deploys frontend to Vercel and backend to Render, syncs environment variables, and returns production-ready URLs in under 3 minutes.",
  url: "https://www.deplo.in",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  featureList: [
    "GitHub Integration",
    "Automatic Stack Detection",
    "Vercel Deployment",
    "Render Deployment",
    "Environment Variable Sync",
    "Zero Configuration",
    "Frontend and Backend Deployment",
    "Production URL Generation",
  ],
  screenshot: "https://www.deplo.in/opengraph-image",
  softwareVersion: "1.0",
  releaseNotes: "MVP release — GitHub to production in under 3 minutes",
};

const organization = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "deplo.ai",
  // Tells Google that brand-name queries ("deplo", "deplo ai") mean this entity.
  alternateName: ["deplo", "deplo ai", "Deplo AI", "deplo.in"],
  url: "https://www.deplo.in",
  logo: "https://www.deplo.in/icon-512.png",
  description:
    "deplo.ai is an AI-powered deployment orchestration platform that connects GitHub repositories to production infrastructure — automatically deploying frontend apps to Vercel and backend services to Render without any DevOps expertise required.",
  foundingDate: "2024",
  // Entity consolidation — every official profile that links back to deplo.in
  // strengthens the brand→site binding. Add LinkedIn/GitHub/Product Hunt URLs
  // here as they exist.
  sameAs: ["https://x.com/deploai"] as string[],
};

const webSite = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "deplo.ai",
  // Google's site-name feature explicitly reads WebSite.alternateName.
  alternateName: ["deplo", "deplo ai", "Deplo AI"],
  url: "https://www.deplo.in",
  description:
    "AI-powered deployment orchestration. Connect GitHub. Get production URLs.",
};

export function StructuredData() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareApplication) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organization) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webSite) }}
      />
    </>
  );
}
