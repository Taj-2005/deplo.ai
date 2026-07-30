import { buildAwaitingEnvEmail, buildFailureEmail, buildSuccessEmail } from "../emailTemplates";
import type { AiFailureDiagnosis } from "../../../domain/analysis/types";

const ctx = {
  appUrl: "https://www.deplo.in",
  deploymentId: "dep_123",
  repoFullName: "acme/shop",
  branch: "main",
  when: new Date("2026-07-30T12:00:00Z"),
};

const diagnosis: AiFailureDiagnosis = {
  likelyCause: "The build ran at the repo root because rootDir was not set.",
  affectedFile: "server/package.json",
  frameworkMisidentified: false,
  correctedFramework: null,
  correctedBuildCommand: "npm install",
  correctedStartCommand: "npm start",
  correctedOutputDirectory: null,
  recommendation: "Set the service root to server/ and redeploy.",
  aiFixPrompt: "In server/package.json add a start script running node index.js…",
  issues: [
    { severity: "low", category: "build", title: "No lockfile", detail: "Add package-lock.json for reproducible builds." },
    { severity: "critical", category: "security", title: "Exposed secret in logs", detail: "DATABASE_URL is printed at startup — remove the console.log." },
    { severity: "high", category: "dependency", title: "express@4.16 has known CVEs", detail: "Upgrade to express@^4.21." },
  ],
  confidence: 0.9,
};

describe("email templates", () => {
  it("failure email carries cause, file, fix, AI prompt, link — issues sorted by severity", () => {
    const mail = buildFailureEmail({ ctx, errorMessage: "Render: 400 …", diagnosis });
    expect(mail.subject).toContain("acme/shop");
    for (const fragment of [
      "rootDir was not set",
      "server/package.json",
      "Set the service root",
      "node index.js",
      "https://www.deplo.in/dashboard/deployments/dep_123",
    ]) {
      expect(mail.html).toContain(fragment);
    }
    const critical = mail.html.indexOf("Exposed secret");
    const high = mail.html.indexOf("known CVEs");
    const low = mail.html.indexOf("No lockfile");
    expect(critical).toBeGreaterThan(-1);
    expect(critical).toBeLessThan(high);
    expect(high).toBeLessThan(low);
    expect(mail.html).not.toContain("<script");
  });

  it("failure email degrades gracefully without a diagnosis", () => {
    const mail = buildFailureEmail({ ctx, errorMessage: "boom", diagnosis: null });
    expect(mail.html).toContain("boom");
    expect(mail.html).toContain("dashboard/deployments/dep_123");
  });

  it("success email lists live URLs", () => {
    const mail = buildSuccessEmail({ ctx, frontendUrl: "https://a.vercel.app", backendUrl: "https://b.onrender.com" });
    expect(mail.subject).toContain("Live");
    expect(mail.html).toContain("https://a.vercel.app");
    expect(mail.html).toContain("https://b.onrender.com");
  });

  it("awaiting-env email lists the missing keys", () => {
    const mail = buildAwaitingEnvEmail({ ctx, missingKeys: ["DATABASE_URL", "JWT_SECRET"] });
    expect(mail.html).toContain("DATABASE_URL");
    expect(mail.text).toContain("JWT_SECRET");
  });
});
