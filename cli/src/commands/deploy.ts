import * as p from "@clack/prompts";
import { api, ApiError, type Repo } from "../api";
import { resolveToken } from "../config";
import { currentBranch, currentRepoFullName } from "../git";
import * as ui from "../ui";
import { login } from "./login";
import { connectRender, connectVercel } from "./connect";
import { celebrateDeployed } from "../celebrate";

const POLL_MS = 2_500;

/** Match the cwd's git remote to a synced deplo repo, syncing on first sight. */
export async function resolveCurrentRepo(): Promise<Repo | null> {
  const fullName = currentRepoFullName();
  if (!fullName) {
    ui.fail("this directory has no GitHub remote — run inside a cloned repo, or deploy from the dashboard");
    return null;
  }

  const find = (repos: Repo[]) => repos.find((r) => r.fullName.toLowerCase() === fullName.toLowerCase()) ?? null;

  let repo = find(await api.repos());
  if (!repo) {
    ui.step(`syncing repos from GitHub…`);
    const { synced } = await api.syncRepos();
    const repos = await api.repos();
    repo = find(repos);
    ui.step(`${synced || repos.length} found${repo ? ", 1 matched this directory" : ""}`);
  }
  if (!repo) {
    ui.fail(`${fullName} is not visible to deplo`);
    ui.hint("private repo? install the GitHub App: deplo.in → dashboard → repositories → configure access");
    return null;
  }
  return repo;
}

/** Missing setup is a prompt, not an error — offer the fixing command inline. */
async function ensurePrerequisites(interactive: boolean): Promise<boolean> {
  if (!resolveToken()) {
    if (!interactive) {
      ui.fail(`not signed in — run ${ui.cyan("deplo login")} (or set DEPLO_TOKEN)`);
      return false;
    }
    const go = await p.confirm({ message: "You're not signed in. Sign in now?" });
    if (p.isCancel(go) || !go) return false;
    await login({});
    if (!resolveToken()) return false;
  }

  const integrations = await api.integrations();
  for (const provider of ["VERCEL", "RENDER"] as const) {
    const connected = integrations.find((i) => i.provider === provider)?.connected ?? false;
    if (connected) continue;
    const name = provider.toLowerCase();
    if (!interactive) {
      ui.fail(`${name} is not connected — run ${ui.cyan(`deplo connect ${name}`)}`);
      return false;
    }
    const go = await p.confirm({ message: `${provider === "VERCEL" ? "Vercel" : "Render"} isn't connected yet. Connect now?` });
    if (p.isCancel(go) || !go) return false;
    if (provider === "VERCEL") await connectVercel({});
    else await connectRender({});
    const again = await api.integrations();
    if (!(again.find((i) => i.provider === provider)?.connected ?? false)) return false;
  }
  return true;
}

async function promptForEnv(deploymentId: string): Promise<boolean> {
  const detail = await api.deployment(deploymentId);
  const required = detail.envVariables.filter((v) => v.isRequired);
  if (required.length === 0) {
    ui.fail(`deployment is waiting for env variables — provide them at ${ui.url(`https://www.deplo.in/dashboard/deployments/${deploymentId}`)}`);
    return false;
  }

  console.log();
  ui.step(`this deployment needs ${required.length} environment variable${required.length > 1 ? "s" : ""}:`);
  const envVars: Array<{ key: string; value: string }> = [];
  for (const v of required) {
    const answer = await p.password({ message: v.key });
    if (p.isCancel(answer)) {
      ui.fail(`cancelled — provide them later at ${ui.url(`https://www.deplo.in/dashboard/deployments/${deploymentId}`)}`);
      return false;
    }
    envVars.push({ key: v.key, value: answer });
  }
  await api.provideEnv(deploymentId, envVars);
  ui.ok("env variables sent — resuming deployment");
  return true;
}

/** Poll a deployment, streaming new log lines until it reaches a terminal state. */
export async function followDeployment(deploymentId: string): Promise<void> {
  const startedAt = Date.now();
  let printed = 0;
  let promptedEnv = false;

  for (;;) {
    const d = await api.deployment(deploymentId);

    for (const line of d.logs.slice(printed)) {
      const lower = line.toLowerCase();
      const decorated = lower.includes("error") || lower.includes("failed")
        ? ui.red(line)
        : lower.startsWith("ai ") || lower.includes("diagnosis")
          ? ui.violet(line)
          : line;
      console.log(`  ${decorated}`);
    }
    printed = d.logs.length;

    if (d.status === "WAITING_FOR_ENV" && !promptedEnv) {
      promptedEnv = true;
      if (!(await promptForEnv(deploymentId))) {
        process.exitCode = 1;
        return;
      }
    }

    if (d.status === "COMPLETED") {
      console.log();
      await celebrateDeployed();
      if (d.backendUrl) ui.ok(`backend live   ${ui.url(d.backendUrl)}`);
      if (d.frontendUrl) ui.ok(`frontend live  ${ui.url(d.frontendUrl)}`);
      const elapsed = d.duration ? d.duration * 1000 : Date.now() - startedAt;
      console.log(`${ui.glyph.dot} Deployed in ${ui.bold(ui.formatDuration(elapsed))} ${ui.dim("— code went in, production URLs came out.")}`);
      return;
    }
    if (d.status === "FAILED") {
      console.log();
      ui.fail(`Deployment failed${d.error ? ` — ${d.error}` : ""}`);
      ui.hint(`full log + AI diagnosis: deplo.in/dashboard/deployments/${deploymentId}`);
      process.exitCode = 1;
      return;
    }
    if (d.status === "CANCELLED") {
      ui.step("deployment cancelled");
      process.exitCode = 1;
      return;
    }

    await new Promise((r) => setTimeout(r, POLL_MS));
  }
}

export async function deploy(options: { yes?: boolean }): Promise<void> {
  const interactive = process.stdout.isTTY === true && !options.yes;
  try {
    if (!(await ensurePrerequisites(interactive))) {
      process.exitCode = process.exitCode ?? 1;
      return;
    }

    const repo = await resolveCurrentRepo();
    if (!repo) {
      process.exitCode = 1;
      return;
    }
    const branch = currentBranch() ?? repo.defaultBranch;
    ui.step(`repo detected ${ui.bold(`github.com/${repo.fullName}`)} ${ui.dim(`(${branch})`)}`);

    if (interactive) {
      const go = await p.confirm({ message: `Deploy ${repo.fullName}?` });
      if (p.isCancel(go) || !go) return;
    }

    const { deploymentId } = await api.startDeployment(repo.id);
    console.log();
    await followDeployment(deploymentId);
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      ui.fail(`token expired or revoked — run ${ui.cyan("deplo login")}`);
    } else {
      ui.fail(err instanceof Error ? err.message : String(err));
    }
    process.exitCode = 1;
  }
}
