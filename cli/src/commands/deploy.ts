import * as p from "@clack/prompts";
import { api, ApiError, type Repo, type StackAnalysis } from "../api";
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

type Provider = "VERCEL" | "RENDER";

/** Not signed in is a prompt, not an error. Must run before any API call. */
async function ensureAuth(interactive: boolean): Promise<boolean> {
  if (resolveToken()) return true;
  if (!interactive) {
    ui.fail(`not signed in — run ${ui.cyan("deplo login")} (or set DEPLO_TOKEN)`);
    return false;
  }
  const go = await p.confirm({ message: "You're not signed in. Sign in now?" });
  if (p.isCancel(go) || !go) return false;
  await login({});
  return Boolean(resolveToken());
}

/**
 * Which providers this repo actually needs: Vercel only when a frontend was
 * detected, Render only when a backend was. A backend-only repo (FastAPI, Go…)
 * must never be blocked on a Vercel connection it will never use. When the
 * stack is unknown, fall back to requiring both.
 */
function requiredProviders(stack: StackAnalysis["stack"] | null): Provider[] {
  if (!stack) return ["VERCEL", "RENDER"];
  const needed: Provider[] = [];
  if (stack.frontend) needed.push("VERCEL");
  if (stack.backend) needed.push("RENDER");
  return needed.length ? needed : ["VERCEL", "RENDER"];
}

/**
 * Missing provider connections are prompts, not errors — offer them inline.
 *
 * The repo is only analyzed when something is actually missing: users who have
 * both providers connected (the common case) pay no extra round-trip, and a
 * backend-only repo is never blocked on a Vercel connection it won't use.
 */
async function ensureProviders(repositoryId: string, interactive: boolean): Promise<boolean> {
  const integrations = await api.integrations();
  const isConnected = (provider: Provider) =>
    integrations.find((i) => i.provider === provider)?.connected ?? false;

  const missing = (["VERCEL", "RENDER"] as const).filter((provider) => !isConnected(provider));
  if (!missing.length) return true;

  const analysis = await analyzeQuietly(repositoryId);
  if (analysis) {
    const parts: string[] = [];
    if (analysis.stack.frontend) parts.push(`frontend=${ui.bold(analysis.stack.frontend)}`);
    if (analysis.stack.backend) parts.push(`backend=${ui.bold(analysis.stack.backend)}`);
    if (parts.length) ui.step(`stack detected  ${parts.join(ui.dim(" · "))}`);
  }

  const needed = requiredProviders(analysis?.stack ?? null);
  const toConnect = missing.filter((provider) => needed.includes(provider));

  for (const provider of toConnect) {
    const name = provider.toLowerCase();
    const label = provider === "VERCEL" ? "Vercel" : "Render";
    if (!interactive) {
      ui.fail(`${name} is not connected — run ${ui.cyan(`deplo connect ${name}`)}`);
      return false;
    }
    const go = await p.confirm({ message: `${label} isn't connected yet. Connect now?` });
    if (p.isCancel(go) || !go) return false;

    if (provider === "VERCEL") await connectVercel({});
    else await connectRender({});

    const again = await api.integrations();
    if (!(again.find((i) => i.provider === provider)?.connected ?? false)) return false;
  }
  return true;
}

/**
 * Detect the stack before deploying so the CLI can ask for exactly the
 * providers this repo needs. Best-effort: analysis failures fall through to
 * requiring both providers rather than blocking the deploy.
 */
async function analyzeQuietly(repositoryId: string): Promise<StackAnalysis | null> {
  try {
    return await api.analyze(repositoryId);
  } catch {
    return null;
  }
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
    // Auth first — everything below needs an authenticated API.
    if (!(await ensureAuth(interactive))) {
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

    // Ask only for the providers this repo actually needs.
    if (!(await ensureProviders(repo.id, interactive))) {
      process.exitCode = process.exitCode ?? 1;
      return;
    }

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
