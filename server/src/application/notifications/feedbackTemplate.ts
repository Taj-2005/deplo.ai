/**
 * Branded email for in-app feedback and bug reports.
 *
 * Mirrors the deployment-mail design system (white surface, #E2E8F0 hairlines,
 * cyan → violet accent bar, system fonts — webfonts never load in email) and is
 * built for triage: the reproduction context sits in a monospace block that can
 * be pasted straight into an issue.
 */

const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const MONO = "'SF Mono',SFMono-Regular,Menlo,Consolas,'Liberation Mono',monospace";

export type FeedbackType = "BUG" | "IDEA" | "OTHER";

export interface FeedbackContext {
  path: string;
  userAgent: string;
  viewport: string;
  appVersion: string;
  occurredAt: string;
  deploymentId?: string | undefined;
}

export interface FeedbackMailInput {
  appUrl: string;
  type: FeedbackType;
  message: string;
  steps?: string | undefined;
  context: FeedbackContext;
  user: { id: string; name: string; email: string; githubLogin: string };
}

const TYPE_META: Record<FeedbackType, { label: string; chipBg: string; chipFg: string; heading: string }> = {
  BUG: { label: "Bug report", chipBg: "#FEF2F2", chipFg: "#DC2626", heading: "Bug report" },
  IDEA: { label: "Idea", chipBg: "#F5F3FF", chipFg: "#7928CA", heading: "Product idea" },
  OTHER: { label: "Feedback", chipBg: "#ECFEFF", chipFg: "#0891B2", heading: "Feedback" },
};

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Preserve author line breaks without trusting any markup they typed. */
function paragraphs(text: string): string {
  return esc(text.trim()).replace(/\n/g, "<br/>");
}

export function buildFeedbackEmail(input: FeedbackMailInput): { subject: string; html: string; text: string } {
  const meta = TYPE_META[input.type];
  const firstLine = input.message.trim().split("\n")[0] ?? "";
  const summary = firstLine.length > 72 ? `${firstLine.slice(0, 69)}…` : firstLine;
  const subject = `[deplo.ai · ${meta.label}] ${summary}`;

  const contextRows: Array<[string, string]> = [
    ["From", `${input.user.name} (@${input.user.githubLogin})`],
    ["Email", input.user.email],
    ["User ID", input.user.id],
    ["Page", input.context.path],
    ["Occurred", input.context.occurredAt],
    ["Viewport", input.context.viewport],
    ["App version", input.context.appVersion],
    ["User agent", input.context.userAgent],
  ];
  if (input.context.deploymentId) {
    contextRows.splice(4, 0, ["Deployment", input.context.deploymentId]);
  }

  const contextBlock = contextRows
    .map(
      ([k, v]) =>
        `<tr><td style="padding:3px 14px 3px 0;color:#64748B;white-space:nowrap;vertical-align:top;">${esc(k)}</td>` +
        `<td style="padding:3px 0;color:#E6E6E6;word-break:break-word;">${esc(v)}</td></tr>`,
    )
    .join("");

  const stepsBlock = input.steps?.trim()
    ? `<h2 style="margin:28px 0 8px;font-size:13px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;color:#64748B;">Steps to reproduce</h2>
       <div style="font-size:14px;line-height:1.7;color:#111827;white-space:pre-wrap;">${paragraphs(input.steps)}</div>`
    : "";

  const html = `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#F8FAFC;">
<div style="display:none;max-height:0;overflow:hidden;">${esc(meta.label)} from ${esc(input.user.githubLogin)} — ${esc(summary)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F8FAFC;padding:32px 12px;">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
  <tr><td style="height:4px;background:linear-gradient(90deg,#00D2FF,#7928CA);border-radius:2px 2px 0 0;"></td></tr>
  <tr><td style="background:#FFFFFF;border:1px solid #E2E8F0;border-top:none;padding:32px 36px;font-family:${FONT};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
      <td>
        <a href="${input.appUrl}" style="text-decoration:none;">
        <table role="presentation" cellpadding="0" cellspacing="0"><tr>
          <td style="padding-right:10px;"><img src="${input.appUrl}/icon-192.png" width="28" height="28" alt="deplo.ai" style="display:block;border-radius:6px;"/></td>
          <td style="font-size:19px;font-weight:700;letter-spacing:-0.02em;color:#000000;font-family:${FONT};">deplo<span style="color:#00D2FF;">.ai</span></td>
        </tr></table>
        </a>
      </td>
      <td align="right">
        <span style="display:inline-block;padding:4px 10px;border-radius:3px;font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;background:${meta.chipBg};color:${meta.chipFg};font-family:${MONO};">${esc(meta.label)}</span>
      </td>
    </tr></table>

    <h1 style="margin:26px 0 0;font-size:24px;line-height:1.25;letter-spacing:-0.02em;color:#000000;">${esc(meta.heading)}</h1>
    <div style="margin-top:6px;font-size:12px;color:#94A3B8;font-family:${MONO};">
      ${esc(input.user.githubLogin)} · ${esc(input.context.path)}
    </div>

    <div style="margin-top:22px;font-size:15px;line-height:1.75;color:#111827;white-space:pre-wrap;">${paragraphs(input.message)}</div>
    ${stepsBlock}

    <h2 style="margin:28px 0 8px;font-size:13px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;color:#64748B;">Reproduction context</h2>
    <div style="background:#0D1117;border:1px solid #1F2937;border-radius:4px;padding:16px 18px;">
      <table role="presentation" cellpadding="0" cellspacing="0" style="font-family:${MONO};font-size:12px;line-height:1.6;">
        ${contextBlock}
      </table>
    </div>

    <div style="margin-top:26px;">
      <a href="mailto:${esc(input.user.email)}" style="display:inline-block;background:#000000;color:#FFFFFF;text-decoration:none;font-size:14px;font-weight:600;padding:11px 20px;border-radius:3px;">Reply to ${esc(input.user.name)}</a>
    </div>
    <div style="margin-top:10px;font-size:12px;color:#94A3B8;">Replying to this email reaches them directly.</div>
  </td></tr>
  <tr><td style="padding:20px 36px;font-family:${FONT};font-size:12px;color:#94A3B8;line-height:1.6;">
    Sent from the feedback widget on <a href="${input.appUrl}" style="color:#94A3B8;">deplo<span style="color:#00D2FF;">.ai</span></a>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;

  const text = [
    `${meta.heading} — deplo.ai`,
    "",
    input.message.trim(),
    input.steps?.trim() ? `\nSteps to reproduce:\n${input.steps.trim()}` : "",
    "",
    "Reproduction context:",
    ...contextRows.map(([k, v]) => `  ${k}: ${v}`),
    "",
    `Reply directly to ${input.user.email}`,
  ]
    .filter(Boolean)
    .join("\n");

  return { subject, html, text };
}
