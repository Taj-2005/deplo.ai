#!/usr/bin/env node
import { Command } from "commander";
import { login, logout } from "./commands/login";
import { connectRender, connectVercel } from "./commands/connect";
import { whoami } from "./commands/whoami";
import { deploy } from "./commands/deploy";
import { status, list, logs, open } from "./commands/status";

const program = new Command();

program
  .name("deplo")
  .description("Deploy full-stack apps into your own Vercel + Render accounts.\nCode goes in. Production URL comes out.")
  .version("0.1.0")
  // Bare `deplo` = deploy, the landing-page promise.
  .action(() => deploy({}));

program
  .command("login")
  .description("Sign in with GitHub in the browser (use --token on headless machines)")
  .option("--token [token]", "paste a CLI token from deplo.in → Settings instead of using the browser")
  .action((opts: { token?: string | boolean }) =>
    login(opts.token !== undefined ? { token: opts.token === true ? "" : String(opts.token) } : {}),
  );

program.command("logout").description("Remove the stored token from this machine").action(logout);

const connect = program.command("connect").description("Connect your Vercel account or Render workspace");
connect
  .command("vercel")
  .description("Authorize the deplo Vercel integration in the browser")
  .option("--print-url", "print the authorization URL instead of opening a browser")
  .action((opts: { printUrl?: boolean }) => connectVercel(opts));
connect
  .command("render")
  .description("Connect Render with a Personal API key (masked prompt)")
  .option("--key <key>", "provide the key non-interactively (scripts)")
  .action((opts: { key?: string }) => connectRender(opts));

program
  .command("whoami")
  .description("Show the signed-in account and provider connection checklist")
  .action(whoami);

program
  .command("deploy")
  .description("Deploy the repo in the current directory and follow the live log")
  .option("-y, --yes", "skip confirmation prompts")
  .action((opts: { yes?: boolean }) => deploy(opts));

program
  .command("status")
  .description("Latest deployment state for the current repo")
  .option("--all", "every project, not just this repo")
  .action((opts: { all?: boolean }) => status(opts));

program.command("list").description("All projects with status, stack, and URLs").action(list);

program
  .command("logs [id]")
  .description("Print a deployment log; follows while the deployment is active")
  .action((id: string | undefined) => logs(id));

program
  .command("open")
  .description("Open the deployed frontend URL")
  .option("--api", "open the backend URL instead")
  .option("--dash", "open the deplo monitoring dashboard for this project")
  .action((opts: { api?: boolean; dash?: boolean }) => open(opts));

program.parseAsync().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
