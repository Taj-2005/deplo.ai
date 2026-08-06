import { api, ApiError, type Integration } from "../api";
import { resolveToken } from "../config";
import * as ui from "../ui";

/** Guard used by every authenticated command; prints the fix, never a stack. */
export async function requireAuth(): Promise<boolean> {
  if (!resolveToken()) {
    ui.fail(`not signed in — run ${ui.cyan("deplo login")}`);
    process.exitCode = 1;
    return false;
  }
  return true;
}

function connectionLine(integrations: Integration[], provider: "VERCEL" | "RENDER"): string {
  const it = integrations.find((i) => i.provider === provider);
  const name = provider.toLowerCase();
  if (it?.connected) {
    const account = it.accountName ?? "connected";
    return `${ui.glyph.ok} ${name.padEnd(20)} ${account}${it.teamName ? ui.dim(` (${it.teamName})`) : ""}`;
  }
  return `${ui.glyph.fail} ${name.padEnd(20)} not connected  ${ui.glyph.arrow} ${ui.cyan(`deplo connect ${name}`)}`;
}

export async function whoami(): Promise<void> {
  if (!(await requireAuth())) return;
  try {
    const [me, integrations] = await Promise.all([api.me(), api.integrations()]);
    console.log(`${ui.glyph.ok} ${"account".padEnd(20)} ${ui.bold(me.githubLogin ?? me.email)}`);
    console.log(connectionLine(integrations, "VERCEL"));
    console.log(connectionLine(integrations, "RENDER"));
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      ui.fail(`token expired or revoked — run ${ui.cyan("deplo login")}`);
    } else {
      ui.fail(err instanceof Error ? err.message : String(err));
    }
    process.exitCode = 1;
  }
}
