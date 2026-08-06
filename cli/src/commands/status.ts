import { api, ApiError, type Deployment } from "../api";
import { currentRepoFullName } from "../git";
import * as ui from "../ui";
import { requireAuth } from "./whoami";
import { followDeployment } from "./deploy";

function printDeployment(d: Deployment): void {
  const stack = d.detectedStack
    ? [d.detectedStack.frontend, d.detectedStack.backend].filter(Boolean).join(" + ")
    : "—";
  console.log(`${ui.statusLabel(d.status)}  ${ui.bold(d.repositoryFullName)} ${ui.dim(`(${d.branch})`)}  ${ui.dim(stack)}`);
  if (d.frontendUrl) console.log(`   ${ui.dim("frontend")}  ${ui.url(d.frontendUrl)}`);
  if (d.backendUrl) console.log(`   ${ui.dim("backend")}   ${ui.url(d.backendUrl)}`);
}

/** Latest deployment per repository, newest first. */
function latestPerRepo(deployments: Deployment[]): Deployment[] {
  const seen = new Set<string>();
  const out: Deployment[] = [];
  for (const d of deployments) {
    if (seen.has(d.repositoryId)) continue;
    seen.add(d.repositoryId);
    out.push(d);
  }
  return out;
}

async function deploymentsForCwd(): Promise<Deployment[] | null> {
  const fullName = currentRepoFullName();
  const all = await api.deployments();
  if (!fullName) return all;
  const mine = all.filter((d) => d.repositoryFullName.toLowerCase() === fullName.toLowerCase());
  if (mine.length === 0) {
    ui.step(`no deployments yet for ${fullName} — run ${ui.cyan("deplo deploy")}`);
    return null;
  }
  return mine;
}

export async function status(options: { all?: boolean }): Promise<void> {
  if (!(await requireAuth())) return;
  try {
    if (options.all) {
      const latest = latestPerRepo(await api.deployments());
      if (latest.length === 0) {
        ui.step(`no deployments yet — run ${ui.cyan("deplo deploy")} inside a project`);
        return;
      }
      latest.forEach(printDeployment);
      return;
    }
    const mine = await deploymentsForCwd();
    if (!mine) return;
    const d = mine[0];
    if (d) printDeployment(d);
  } catch (err) {
    handleError(err);
  }
}

export async function list(): Promise<void> {
  if (!(await requireAuth())) return;
  try {
    const latest = latestPerRepo(await api.deployments());
    if (latest.length === 0) {
      ui.step(`no projects yet — run ${ui.cyan("deplo deploy")} inside a repo`);
      return;
    }
    latest.forEach(printDeployment);
  } catch (err) {
    handleError(err);
  }
}

export async function logs(id: string | undefined): Promise<void> {
  if (!(await requireAuth())) return;
  try {
    let deploymentId = id;
    if (!deploymentId) {
      const mine = await deploymentsForCwd();
      if (!mine) return;
      deploymentId = mine[0]?.id;
    }
    if (!deploymentId) return;

    const d = await api.deployment(deploymentId);
    const terminal = ["COMPLETED", "FAILED", "CANCELLED"].includes(d.status);
    if (terminal) {
      d.logs.forEach((line) => console.log(`  ${line}`));
      if (d.status === "FAILED" && d.error) ui.fail(d.error);
      return;
    }
    // Active — keep following like deploy does.
    await followDeployment(deploymentId);
  } catch (err) {
    handleError(err);
  }
}

export async function open(options: { api?: boolean; dash?: boolean }): Promise<void> {
  if (!(await requireAuth())) return;
  try {
    const mine = await deploymentsForCwd();
    if (!mine) return;
    const completed = mine.find((d) => d.status === "COMPLETED");

    let target: string | null;
    if (options.dash) {
      const d = mine[0];
      target = d ? `https://www.deplo.in/dashboard/monitoring/${d.repositoryId}` : null;
    } else if (options.api) {
      target = completed?.backendUrl ?? null;
    } else {
      target = completed?.frontendUrl ?? null;
    }

    if (!target) {
      ui.fail(`nothing to open yet — run ${ui.cyan("deplo deploy")} first`);
      process.exitCode = 1;
      return;
    }
    const { openInBrowser } = await import("../handoff");
    ui.step(`opening ${ui.url(target)}`);
    openInBrowser(target);
  } catch (err) {
    handleError(err);
  }
}

function handleError(err: unknown): void {
  if (err instanceof ApiError && err.status === 401) {
    ui.fail(`token expired or revoked — run ${ui.cyan("deplo login")}`);
  } else {
    ui.fail(err instanceof Error ? err.message : String(err));
  }
  process.exitCode = 1;
}
