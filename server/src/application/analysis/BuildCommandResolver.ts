import type { FrameworkId, Language, PackageManager, Runtime } from "../../domain/analysis/types";
import type { RepoSnapshot } from "./ports";

export interface BuildPlan {
  installCommand: string | null;
  buildCommand: string | null;
  outputDirectory: string | null;
  startCommand: string | null;
}

/** Static, framework-specific defaults; overridden by real package.json scripts. */
interface FrameworkDefaults {
  outputDir: string | null;
  /** Default start command for long-running (backend/SSR) frameworks. */
  start: string | null;
}

const FRAMEWORK_DEFAULTS: Record<FrameworkId, FrameworkDefaults> = {
  nextjs: { outputDir: ".next", start: "next start" },
  nuxt: { outputDir: ".output/public", start: "node .output/server/index.mjs" },
  sveltekit: { outputDir: "build", start: "node build" },
  remix: { outputDir: "build", start: "remix-serve build" },
  gatsby: { outputDir: "public", start: null },
  astro: { outputDir: "dist", start: null },
  angular: { outputDir: "dist", start: null },
  vite: { outputDir: "dist", start: null },
  vue: { outputDir: "dist", start: null },
  svelte: { outputDir: "dist", start: null },
  react: { outputDir: "build", start: null },
  "static-html": { outputDir: null, start: null },
  express: { outputDir: null, start: "node ." },
  fastify: { outputDir: null, start: "node ." },
  nestjs: { outputDir: "dist", start: "node dist/main.js" },
  hono: { outputDir: null, start: "node ." },
  koa: { outputDir: null, start: "node ." },
  bun: { outputDir: null, start: "bun run start" },
  fastapi: { outputDir: null, start: "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}" },
  flask: { outputDir: null, start: "gunicorn app:app --bind 0.0.0.0:${PORT:-8000}" },
  django: { outputDir: "staticfiles", start: "gunicorn ${DJANGO_WSGI:-app.wsgi} --bind 0.0.0.0:${PORT:-8000}" },
  "spring-boot": { outputDir: "target", start: "java -jar target/app.jar" },
  go: { outputDir: null, start: "./app" },
  unknown: { outputDir: null, start: null },
};

function runPrefix(pm: PackageManager): string {
  switch (pm) {
    case "yarn":
      return "yarn";
    case "pnpm":
      return "pnpm run";
    case "bun":
      return "bun run";
    default:
      return "npm run";
  }
}

function installCommand(pm: PackageManager): string {
  switch (pm) {
    case "yarn":
      return "yarn install --frozen-lockfile";
    case "pnpm":
      return "pnpm install --frozen-lockfile";
    case "bun":
      return "bun install";
    default:
      return "npm install";
  }
}

/**
 * Resolves the concrete install / build / output / start plan for a component,
 * combining framework defaults with the project's actual package.json scripts.
 */
export class BuildCommandResolver {
  constructor(private readonly snapshot: RepoSnapshot) {}

  async resolve(
    componentPath: string,
    framework: FrameworkId,
    language: Language,
    runtime: Runtime,
  ): Promise<BuildPlan> {
    const defaults = FRAMEWORK_DEFAULTS[framework];

    if (language === "javascript" || language === "typescript") {
      return this.resolveNode(componentPath, framework, runtime.packageManager ?? "npm", defaults);
    }
    if (language === "python") {
      return this.resolvePython(componentPath, defaults);
    }
    if (language === "go") {
      return { installCommand: "go mod download", buildCommand: "go build -o app ./...", outputDirectory: null, startCommand: defaults.start };
    }
    if (language === "java") {
      const gradle = (await this.snapshot.hasFile(join(componentPath, "build.gradle"))) || (await this.snapshot.hasFile(join(componentPath, "build.gradle.kts")));
      return {
        installCommand: null,
        buildCommand: gradle ? "./gradlew build -x test" : "./mvnw -q -DskipTests package",
        outputDirectory: gradle ? "build/libs" : "target",
        startCommand: defaults.start,
      };
    }
    return { installCommand: null, buildCommand: null, outputDirectory: defaults.outputDir, startCommand: defaults.start };
  }

  private async resolveNode(
    componentPath: string,
    framework: FrameworkId,
    pm: PackageManager,
    defaults: FrameworkDefaults,
  ): Promise<BuildPlan> {
    const pkg = await this.snapshot.readJson<{ scripts?: Record<string, string> }>(join(componentPath, "package.json"));
    const scripts = pkg?.scripts ?? {};
    const run = runPrefix(pm);

    const buildCommand = scripts["build"] ? `${run} build` : null;
    const startCommand = scripts["start"] ? `${startPrefix(pm)} start` : defaults.start;

    return {
      installCommand: installCommand(pm),
      buildCommand,
      outputDirectory: defaults.outputDir,
      startCommand,
    };
  }

  private async resolvePython(componentPath: string, defaults: FrameworkDefaults): Promise<BuildPlan> {
    const hasReq = await this.snapshot.hasFile(join(componentPath, "requirements.txt"));
    const hasPoetry = await this.snapshot.hasFile(join(componentPath, "pyproject.toml"));
    const installCmd = hasReq
      ? "pip install -r requirements.txt"
      : hasPoetry
        ? "pip install ."
        : "pip install -r requirements.txt";
    return { installCommand: installCmd, buildCommand: null, outputDirectory: defaults.outputDir, startCommand: defaults.start };
  }
}

function startPrefix(pm: PackageManager): string {
  // `npm start` / `yarn start` / `pnpm start` / `bun run start`
  return pm === "bun" ? "bun run" : pm;
}

function join(dir: string, rel: string): string {
  return dir ? `${dir}/${rel}` : rel;
}
