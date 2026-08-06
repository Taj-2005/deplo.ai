import * as p from "@clack/prompts";
import { api } from "../api";
import { openInBrowser } from "../handoff";
import * as ui from "../ui";
import { requireAuth } from "./whoami";

const POLL_MS = 3_000;
const POLL_TIMEOUT_MS = 5 * 60_000;

async function pollUntilConnected(provider: "VERCEL" | "RENDER"): Promise<boolean> {
  const deadline = Date.now() + POLL_TIMEOUT_MS;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, POLL_MS));
    const integrations = await api.integrations();
    const it = integrations.find((i) => i.provider === provider);
    if (it?.connected) {
      ui.ok(`connected ${ui.bold(`${provider.toLowerCase()}: ${it.accountName ?? "you"}`)}`);
      return true;
    }
  }
  ui.fail("timed out waiting for the connection (5 minutes)");
  return false;
}

export async function connectVercel(options: { printUrl?: boolean }): Promise<void> {
  if (!(await requireAuth())) return;

  const integrations = await api.integrations();
  const existing = integrations.find((i) => i.provider === "VERCEL");
  if (existing?.connected) {
    ui.ok(`vercel already connected (${existing.accountName ?? "you"})`);
    return;
  }

  const url = await api.vercelInstallUrl();
  if (options.printUrl) {
    console.log(url);
    ui.hint("open this link in any browser, authorize, then re-run `deplo whoami`");
    return;
  }

  ui.step("opening Vercel authorization…  waiting");
  openInBrowser(url);
  ui.hint(`(no browser here? ${ui.cyan("deplo connect vercel --print-url")})`);
  if (!(await pollUntilConnected("VERCEL"))) process.exitCode = 1;
}

export async function connectRender(options: { key?: string }): Promise<void> {
  if (!(await requireAuth())) return;

  const integrations = await api.integrations();
  const existing = integrations.find((i) => i.provider === "RENDER");
  if (existing?.connected && !options.key) {
    ui.ok(`render already connected (${existing.accountName ?? "you"})`);
    ui.hint("pass --key to rotate the API key");
    return;
  }

  let key = options.key;
  if (!key) {
    ui.hint(`create one at ${ui.url("https://dashboard.render.com/settings#api-keys")}`);
    const answer = await p.password({ message: "Render API key (rnd_…)" });
    if (p.isCancel(answer)) return;
    key = answer;
  }

  try {
    const result = await api.connectRender(key.trim());
    ui.ok(`connected ${ui.bold(`render: ${result.accountName ?? "you"}`)}`);
  } catch (err) {
    ui.fail(err instanceof Error ? err.message : String(err));
    process.exitCode = 1;
  }
}
