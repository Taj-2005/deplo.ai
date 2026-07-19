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
  fastapi: { outputDir: null, start: "uvicorn main:app --host 0.0.0.0 --port $PORT" },
  flask: { outputDir: null, start: "gunicorn --bind 0.0.0.0:$PORT app:app" },
  django: { outputDir: null, start: "gunicorn --bind 0.0.0.0:$PORT app.wsgi:application" },
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
      return this.resolvePython(componentPath, framework, defaults);
    }
    if (language === "go") {
      return this.resolveGo(componentPath, defaults);
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

  /**
   * Go build target from the actual repo layout: root main.go → build ".",
   * cmd/<name>/main.go convention → build that package.
   */
  private async resolveGo(componentPath: string, defaults: FrameworkDefaults): Promise<BuildPlan> {
    const prefix = componentPath ? `${componentPath}/` : "";
    let target = ".";

    if (!(await this.snapshot.hasFile(join(componentPath, "main.go")))) {
      for (const p of await this.snapshot.paths()) {
        if (!p.startsWith(prefix)) continue;
        const m = p.slice(prefix.length).match(/^cmd\/([A-Za-z0-9_-]+)\/main\.go$/);
        if (m) {
          target = `./cmd/${m[1]}`;
          break;
        }
      }
    }

    return {
      installCommand: "go mod download",
      buildCommand: `go build -o app ${target}`,
      outputDirectory: null,
      startCommand: defaults.start,
    };
  }

  private async resolvePython(
    componentPath: string,
    framework: FrameworkId,
    defaults: FrameworkDefaults,
  ): Promise<BuildPlan> {
    const hasReq = await this.snapshot.hasFile(join(componentPath, "requirements.txt"));
    const hasPoetry = await this.snapshot.hasFile(join(componentPath, "pyproject.toml"));
    const installCmd = hasReq
      ? "pip install -r requirements.txt"
      : hasPoetry
        ? "pip install ."
        : "pip install -r requirements.txt";

    const startCommand = (await this.detectPythonStart(componentPath, framework)) ?? defaults.start;
    return { installCommand: installCmd, buildCommand: null, outputDirectory: defaults.outputDir, startCommand };
  }

  /**
   * Detect the real app module from the repo instead of assuming main:app —
   * e.g. `application.py` containing `application = Flask(__name__)` yields
   * `gunicorn --bind 0.0.0.0:$PORT application:application`.
   */
  private async detectPythonStart(componentPath: string, framework: FrameworkId): Promise<string | null> {
    const CANDIDATE_FILES = ["main.py", "app.py", "application.py", "server.py", "api.py", "wsgi.py", "asgi.py"];

    if (framework === "django") {
      // Find the project package: <pkg>/wsgi.py directly under the component.
      const prefix = componentPath ? `${componentPath}/` : "";
      for (const p of await this.snapshot.paths()) {
        if (!p.startsWith(prefix)) continue;
        const rel = p.slice(prefix.length);
        const m = rel.match(/^([A-Za-z_][A-Za-z0-9_]*)\/wsgi\.py$/);
        if (m) return `gunicorn --bind 0.0.0.0:$PORT ${m[1]}.wsgi:application`;
      }
      return null;
    }

    const varPattern =
      framework === "fastapi" ? /([A-Za-z_][A-Za-z0-9_]*)\s*=\s*FastAPI\s*\(/ : /([A-Za-z_][A-Za-z0-9_]*)\s*=\s*Flask\s*\(/;

    for (const file of CANDIDATE_FILES) {
      const content = await this.snapshot.readFile(join(componentPath, file));
      if (!content) continue;
      const m = content.match(varPattern);
      if (!m) continue;
      const module = file.replace(/\.py$/, "");
      const appVar = m[1]!;
      return framework === "fastapi"
        ? `uvicorn ${module}:${appVar} --host 0.0.0.0 --port $PORT`
        : `gunicorn --bind 0.0.0.0:$PORT ${module}:${appVar}`;
    }
    return null;
  }
}

function startPrefix(pm: PackageManager): string {
  // `npm start` / `yarn start` / `pnpm start` / `bun run start`
  return pm === "bun" ? "bun run" : pm;
}

function join(dir: string, rel: string): string {
  return dir ? `${dir}/${rel}` : rel;
}
