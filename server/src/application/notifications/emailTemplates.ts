import type { AiFailureDiagnosis, DiagnosisIssue } from "../../domain/analysis/types";

/**
 * Branded, email-client-safe HTML templates for deployment lifecycle mail.
 * Follows the deplo.ai design system: white surface, #E2E8F0 hairlines,
 * black primary, cyan #00D2FF → violet #7928CA accent gradient, dark
 * terminal blocks, system font stack (webfonts don't load in email).
 */

const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const MONO = "'SF Mono',SFMono-Regular,Menlo,Consolas,'Liberation Mono',monospace";

export interface DeploymentMailContext {
  appUrl: string; // canonical frontend origin, e.g. https://www.deplo.in
  deploymentId: string;
  repoFullName: string;
  branch: string;
  when: Date;
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

const SEVERITY_STYLE: Record<DiagnosisIssue["severity"], { bg: string; fg: string }> = {
  critical: { bg: "#FEF2F2", fg: "#DC2626" },
  high: { bg: "#FFF7ED", fg: "#EA580C" },
  medium: { bg: "#FFFBEB", fg: "#D97706" },
  low: { bg: "#F8FAFC", fg: "#64748B" },
};

const SEVERITY_ORDER: Record<DiagnosisIssue["severity"], number> = { critical: 0, high: 1, medium: 2, low: 3 };

function shell(title: string, statusChip: string, ctx: DeploymentMailContext, body: string): string {
  return `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#F8FAFC;">
<div style="display:none;max-height:0;overflow:hidden;">${esc(title)} — ${esc(ctx.repoFullName)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F8FAFC;padding:32px 12px;">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
  <tr><td style="height:4px;background:linear-gradient(90deg,#00D2FF,#7928CA);border-radius:2px 2px 0 0;"></td></tr>
  <tr><td style="background:#FFFFFF;border:1px solid #E2E8F0;border-top:none;padding:32px 36px;font-family:${FONT};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
      <td>
        <a href="${ctx.appUrl}" style="text-decoration:none;">
        <table role="presentation" cellpadding="0" cellspacing="0"><tr>
          <td style="padding-right:10px;"><img src="${ctx.appUrl}/icon-192.png" width="28" height="28" alt="deplo.ai" style="display:block;border-radius:6px;"/></td>
          <td style="font-size:19px;font-weight:700;letter-spacing:-0.02em;color:#000000;font-family:${FONT};">deplo<span style="color:#00D2FF;">.ai</span></td>
        </tr></table>
        </a>
      </td>
      <td align="right">${statusChip}</td>
    </tr></table>
    <div style="margin-top:6px;font-size:12px;color:#94A3B8;font-family:${MONO};">
      ${esc(ctx.repoFullName)} · ${esc(ctx.branch)} · ${ctx.when.toUTCString()}
    </div>
    <h1 style="margin:26px 0 0;font-size:24px;line-height:1.25;letter-spacing:-0.02em;color:#000000;">${title}</h1>
    ${body}
  </td></tr>
  <tr><td style="padding:20px 36px;font-family:${FONT};font-size:12px;color:#94A3B8;line-height:1.6;">
    Your apps run in <span style="color:#64748B;">your own</span> Vercel &amp; Render accounts — you own every project, deployment, log, and domain.<br/>
    <a href="${ctx.appUrl}" style="color:#64748B;">deplo.in</a> · You're receiving this because a deployment ran in your <a href="${ctx.appUrl}" style="color:#94A3B8;text-decoration:underline;">deplo.ai</a> account.
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
}

function chip(label: string, fg: string, bg: string): string {
  return `<span style="display:inline-block;padding:4px 10px;border-radius:3px;background:${bg};color:${fg};font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;font-family:${FONT};">${label}</span>`;
}

function button(label: string, href: string): string {
  return `<a href="${href}" style="display:inline-block;background:#000000;color:#FFFFFF;text-decoration:none;padding:11px 22px;font-size:13px;font-weight:600;font-family:${FONT};border-radius:4px;">${label} →</a>`;
}

function sectionLabel(text: string): string {
  return `<div style="margin:28px 0 8px;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#94A3B8;font-family:${FONT};">${text}</div>`;
}

function codeBlock(content: string): string {
  return `<div style="background:#0A0A0A;border-radius:6px;padding:16px 18px;font-family:${MONO};font-size:12.5px;line-height:1.7;color:#E6EDF3;white-space:pre-wrap;word-break:break-word;">${esc(content)}</div>`;
}

// ─── Failed ──────────────────────────────────────────────────────────────────

export interface FailureMailData {
  ctx: DeploymentMailContext;
  errorMessage: string;
  diagnosis: AiFailureDiagnosis | null;
}

export function buildFailureEmail({ ctx, errorMessage, diagnosis }: FailureMailData): {
  subject: string;
  html: string;
  text: string;
} {
  const deployUrl = `${ctx.appUrl}/dashboard/deployments/${ctx.deploymentId}`;
  const issues = [...(diagnosis?.issues ?? [])].sort(
    (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity],
  );

  const corrections: Array<[string, string]> = [];
  if (diagnosis?.correctedBuildCommand) corrections.push(["Build command", diagnosis.correctedBuildCommand]);
  if (diagnosis?.correctedStartCommand) corrections.push(["Start command", diagnosis.correctedStartCommand]);
  if (diagnosis?.correctedOutputDirectory) corrections.push(["Output directory", diagnosis.correctedOutputDirectory]);

  const body = `
${sectionLabel("What happened")}
<div style="font-size:14px;line-height:1.7;color:#334155;font-family:${FONT};">${esc(diagnosis?.likelyCause ?? "The deployment failed before completing. The raw error is below.")}</div>

${diagnosis?.affectedFile ? `${sectionLabel("Affected file")}
<div style="font-family:${MONO};font-size:13px;color:#000000;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:4px;padding:10px 14px;display:inline-block;">${esc(diagnosis.affectedFile)}</div>` : ""}

${sectionLabel("How to fix it")}
<div style="font-size:14px;line-height:1.7;color:#334155;font-family:${FONT};">${esc(diagnosis?.recommendation ?? "Open the deployment to inspect the full build log, fix the reported error, and hit Deploy again.")}</div>
${corrections.length ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:12px;width:100%;border:1px solid #E2E8F0;border-radius:4px;">${corrections
    .map(
      ([k, v]) => `<tr><td style="padding:9px 14px;border-bottom:1px solid #E2E8F0;font-size:12px;color:#64748B;font-family:${FONT};width:150px;">${k}</td><td style="padding:9px 14px;border-bottom:1px solid #E2E8F0;font-family:${MONO};font-size:12.5px;color:#000000;">${esc(v)}</td></tr>`,
    )
    .join("")}</table>` : ""}

${diagnosis?.aiFixPrompt ? `${sectionLabel("Fix it with your AI tool")}
<div style="font-size:13px;color:#64748B;font-family:${FONT};margin-bottom:8px;">Copy this prompt into Cursor, Claude Code, or Copilot — it contains everything needed to fix the repo:</div>
${codeBlock(diagnosis.aiFixPrompt)}` : ""}

${issues.length ? `${sectionLabel("Also worth fixing — by priority")}
${issues
    .map((i) => {
      const s = SEVERITY_STYLE[i.severity];
      return `<div style="border:1px solid #E2E8F0;border-radius:4px;padding:12px 14px;margin-bottom:8px;">
<span style="display:inline-block;padding:2px 8px;border-radius:3px;background:${s.bg};color:${s.fg};font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;font-family:${FONT};">${i.severity}</span>
<span style="display:inline-block;margin-left:6px;font-size:10px;color:#94A3B8;text-transform:uppercase;letter-spacing:0.05em;font-family:${FONT};">${i.category}</span>
<div style="margin-top:6px;font-size:13.5px;font-weight:600;color:#000000;font-family:${FONT};">${esc(i.title)}</div>
<div style="margin-top:3px;font-size:13px;line-height:1.6;color:#64748B;font-family:${FONT};">${esc(i.detail)}</div>
</div>`;
    })
    .join("")}` : ""}

${sectionLabel("Raw error")}
${codeBlock(errorMessage)}

<div style="margin-top:28px;">${button("View deployment & retry", deployUrl)}</div>`;

  const text = [
    `Deployment failed — ${ctx.repoFullName} (${ctx.branch})`,
    "",
    `What happened: ${diagnosis?.likelyCause ?? errorMessage}`,
    diagnosis?.affectedFile ? `Affected file: ${diagnosis.affectedFile}` : "",
    `How to fix: ${diagnosis?.recommendation ?? "Open the deployment, fix the error, redeploy."}`,
    diagnosis?.aiFixPrompt ? `\nAI tool prompt:\n${diagnosis.aiFixPrompt}` : "",
    issues.length ? `\nAlso worth fixing:\n${issues.map((i) => `[${i.severity}] ${i.title} — ${i.detail}`).join("\n")}` : "",
    `\nRaw error: ${errorMessage}`,
    `\nView deployment: ${deployUrl}`,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    subject: `✗ Deployment failed — ${ctx.repoFullName}`,
    html: shell("Deployment failed", chip("Failed", "#DC2626", "#FEF2F2"), ctx, body),
    text,
  };
}

// ─── Succeeded ───────────────────────────────────────────────────────────────

export interface SuccessMailData {
  ctx: DeploymentMailContext;
  frontendUrl: string | null;
  backendUrl: string | null;
}

export function buildSuccessEmail({ ctx, frontendUrl, backendUrl }: SuccessMailData): {
  subject: string;
  html: string;
  text: string;
} {
  const deployUrl = `${ctx.appUrl}/dashboard/deployments/${ctx.deploymentId}`;
  const urlRow = (label: string, url: string): string =>
    `<tr><td style="padding:12px 14px;border-bottom:1px solid #E2E8F0;font-size:12px;color:#64748B;font-family:${FONT};width:110px;">${label}</td>
<td style="padding:12px 14px;border-bottom:1px solid #E2E8F0;"><span style="display:inline-block;width:8px;height:8px;border-radius:4px;background:#34D399;margin-right:8px;"></span><a href="${url}" style="font-family:${MONO};font-size:13px;color:#000000;">${url}</a></td></tr>`;

  const body = `
<div style="margin-top:10px;font-size:14px;line-height:1.7;color:#334155;font-family:${FONT};">Your app is live — deployed into your own accounts, wired together automatically.</div>
${sectionLabel("Production URLs")}
<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border:1px solid #E2E8F0;border-radius:4px;">
${frontendUrl ? urlRow("Frontend", frontendUrl) : ""}
${backendUrl ? urlRow("Backend", backendUrl) : ""}
</table>
<div style="margin-top:28px;">${button("View deployment", deployUrl)}</div>`;

  const text = [
    `Deployment succeeded — ${ctx.repoFullName} (${ctx.branch})`,
    frontendUrl ? `Frontend: ${frontendUrl}` : "",
    backendUrl ? `Backend: ${backendUrl}` : "",
    `View deployment: ${deployUrl}`,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    subject: `✓ Live — ${ctx.repoFullName}`,
    html: shell("Code went in. Production URLs came out.", chip("Deployed", "#16A34A", "#F0FDF4"), ctx, body),
    text,
  };
}

// ─── Waiting for env vars ────────────────────────────────────────────────────

export interface AwaitingEnvMailData {
  ctx: DeploymentMailContext;
  missingKeys: string[];
}

export function buildAwaitingEnvEmail({ ctx, missingKeys }: AwaitingEnvMailData): {
  subject: string;
  html: string;
  text: string;
} {
  const deployUrl = `${ctx.appUrl}/dashboard/deployments/${ctx.deploymentId}`;
  const body = `
<div style="margin-top:10px;font-size:14px;line-height:1.7;color:#334155;font-family:${FONT};">Your deployment is analyzed and ready — it's waiting on ${missingKeys.length} required environment variable${missingKeys.length === 1 ? "" : "s"} found in your code:</div>
${sectionLabel("Required variables")}
${codeBlock(missingKeys.join("\n"))}
<div style="margin-top:10px;font-size:13px;color:#64748B;font-family:${FONT};">Values are asked once, stored for this deployment, and injected into the right side of your app automatically.</div>
<div style="margin-top:28px;">${button("Add variables & continue", deployUrl)}</div>`;

  const text = [
    `Action needed — ${ctx.repoFullName} is waiting for environment variables`,
    "",
    `Required: ${missingKeys.join(", ")}`,
    `Continue: ${deployUrl}`,
  ].join("\n");

  return {
    subject: `Action needed — ${ctx.repoFullName} is waiting on env variables`,
    html: shell("Almost there — variables needed", chip("Action needed", "#D97706", "#FFFBEB"), ctx, body),
    text,
  };
}
