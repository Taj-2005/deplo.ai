import * as p from "@clack/prompts";
import { api, ApiError } from "../api";
import { readConfig, writeConfig, clearConfig, configPath, resolveToken } from "../config";
import { buildHandoff, listenForToken, openInBrowser } from "../handoff";
import * as ui from "../ui";

async function verifyAndStore(token: string): Promise<boolean> {
  try {
    const me = await api.me(token);
    writeConfig({ ...readConfig(), token });
    ui.ok(`signed in ${ui.bold(me.githubLogin ?? me.email)} · token saved to ${ui.dim(configPath())}`);
    return true;
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      ui.fail("that token was not accepted — create a new one at deplo.in → Settings → CLI tokens");
    } else {
      ui.fail(`could not verify the token: ${err instanceof Error ? err.message : String(err)}`);
    }
    return false;
  }
}

export async function login(options: { token?: string }): Promise<void> {
  // Manual paste — headless boxes, CI, SSH.
  if (options.token !== undefined) {
    let token = options.token;
    if (!token) {
      const answer = await p.password({ message: "Paste your deplo CLI token (dpl_…)" });
      if (p.isCancel(answer)) return;
      token = answer;
    }
    if (!(await verifyAndStore(token.trim()))) process.exitCode = 1;
    return;
  }

  // Browser hand-off.
  const { state, authUrl } = buildHandoff();
  const { port, result } = await listenForToken(state);
  const url = authUrl(port);

  ui.step(`opening ${ui.url(url)}`);
  ui.hint("(no browser? run `deplo login --token` and paste one instead)");
  openInBrowser(url);

  try {
    const { token } = await result;
    if (!(await verifyAndStore(token))) process.exitCode = 1;
  } catch (err) {
    ui.fail(err instanceof Error ? err.message : String(err));
    process.exitCode = 1;
  }
}

export function logout(): void {
  if (!resolveToken()) {
    ui.step("not signed in");
    return;
  }
  clearConfig();
  ui.ok("signed out — token removed from this machine");
  ui.hint("revoke it fully at deplo.in → Settings → CLI tokens");
}
