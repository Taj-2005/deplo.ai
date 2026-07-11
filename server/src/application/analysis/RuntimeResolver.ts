import type { Language, PackageManager, Runtime } from "../../domain/analysis/types";
import type { RepoSnapshot } from "./ports";

/** Resolves runtime language version + package manager for a component. */
export class RuntimeResolver {
  constructor(private readonly snapshot: RepoSnapshot) {}

  async resolve(componentPath: string, language: Language): Promise<Runtime> {
    const join = (rel: string): string => (componentPath ? `${componentPath}/${rel}` : rel);

    const packageManager = await this.detectPackageManager(componentPath);
    let version: string | null = null;

    switch (language) {
      case "javascript":
      case "typescript": {
        const pkg = await this.snapshot.readJson<{ engines?: { node?: string } }>(join("package.json"));
        version = cleanVersion(pkg?.engines?.node ?? null);
        if (!version) {
          version = cleanVersion((await this.snapshot.readFile(join(".nvmrc"))) ?? (await this.snapshot.readFile(join(".node-version"))));
        }
        break;
      }
      case "python": {
        version =
          cleanVersion(await this.snapshot.readFile(join(".python-version"))) ??
          cleanVersion(await this.snapshot.readFile(join("runtime.txt")));
        if (!version) {
          const pyproject = await this.snapshot.readFile(join("pyproject.toml"));
          const m = pyproject?.match(/requires-python\s*=\s*["']?[>=~^ ]*([0-9]+\.[0-9]+)/);
          version = m?.[1] ?? null;
        }
        break;
      }
      case "go": {
        const goMod = await this.snapshot.readFile(join("go.mod"));
        version = goMod?.match(/^go\s+([0-9]+\.[0-9]+)/m)?.[1] ?? null;
        break;
      }
      default:
        version = null;
    }

    return { language, version, packageManager: language === "javascript" || language === "typescript" ? packageManager : null };
  }

  private async detectPackageManager(componentPath: string): Promise<PackageManager> {
    const join = (rel: string): string => (componentPath ? `${componentPath}/${rel}` : rel);

    // Prefer the explicit corepack field, then lockfiles (component, then root).
    const pkg = await this.snapshot.readJson<{ packageManager?: string }>(join("package.json"));
    const declared = pkg?.packageManager?.split("@")[0];
    if (declared === "pnpm" || declared === "yarn" || declared === "bun" || declared === "npm") return declared;

    for (const dir of componentPath ? [componentPath, ""] : [""]) {
      const at = (rel: string): string => (dir ? `${dir}/${rel}` : rel);
      if (await this.snapshot.hasFile(at("bun.lockb"))) return "bun";
      if (await this.snapshot.hasFile(at("pnpm-lock.yaml"))) return "pnpm";
      if (await this.snapshot.hasFile(at("yarn.lock"))) return "yarn";
      if (await this.snapshot.hasFile(at("package-lock.json"))) return "npm";
    }
    return "npm";
  }
}

function cleanVersion(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const m = raw.match(/([0-9]+(?:\.[0-9]+)*)/);
  return m?.[1] ?? null;
}
