import { mkdirSync, readFileSync, writeFileSync, rmSync, chmodSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

/**
 * CLI configuration store — ~/.config/deplo/config.json, chmod 0600.
 * Holds exactly one deplo token; never provider credentials.
 */

export interface CliConfig {
  token?: string;
  apiUrl?: string;
}

const CONFIG_DIR = join(homedir(), ".config", "deplo");
const CONFIG_PATH = join(CONFIG_DIR, "config.json");

export const DEFAULT_API_URL = "https://www.deplo.in/api/v1";
export const DEFAULT_WEB_URL = "https://www.deplo.in";

export function readConfig(): CliConfig {
  try {
    return JSON.parse(readFileSync(CONFIG_PATH, "utf8")) as CliConfig;
  } catch {
    return {};
  }
}

export function writeConfig(config: CliConfig): void {
  mkdirSync(CONFIG_DIR, { recursive: true });
  writeFileSync(CONFIG_PATH, `${JSON.stringify(config, null, 2)}\n`, { mode: 0o600 });
  chmodSync(CONFIG_PATH, 0o600);
}

export function clearConfig(): void {
  try {
    rmSync(CONFIG_PATH);
  } catch {
    // already gone
  }
}

export function configPath(): string {
  return CONFIG_PATH;
}

/** Token resolution order: DEPLO_TOKEN env (CI) → config file. */
export function resolveToken(): string | null {
  return process.env["DEPLO_TOKEN"] ?? readConfig().token ?? null;
}

export function resolveApiUrl(): string {
  return (process.env["DEPLO_API_URL"] ?? readConfig().apiUrl ?? DEFAULT_API_URL).replace(/\/$/, "");
}

/** The web origin hosting /cli-auth — defaults to production, override for staging. */
export function resolveWebUrl(): string {
  return (process.env["DEPLO_WEB_URL"] ?? DEFAULT_WEB_URL).replace(/\/$/, "");
}
