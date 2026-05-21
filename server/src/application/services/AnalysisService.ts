import { GitHubAdapter } from "../../infrastructure/github/GitHubAdapter";
import type { DetectedStack, EnvVariable } from "../../domain/deployment/Deployment";
import { decrypt } from "../../shared/utils/crypto";
import { logger } from "../../shared/logger/logger";

export class AnalysisService {
  constructor(private readonly github: GitHubAdapter) {}

  async analyzeRepository(
    encryptedToken: string,
    fullName: string,
  ): Promise<{ stack: DetectedStack; envVars: EnvVariable[] }> {
    const token = decrypt(encryptedToken);

    const [packageJson, nextConfig, viteConfig, envExample] = await Promise.all([
      this.github.getFileContent(token, fullName, "package.json"),
      this.github.getFileContent(token, fullName, "next.config.js").then(
        (r) => r ?? this.github.getFileContent(token, fullName, "next.config.ts"),
      ),
      this.github.getFileContent(token, fullName, "vite.config.ts").then(
        (r) => r ?? this.github.getFileContent(token, fullName, "vite.config.js"),
      ),
      this.github.getFileContent(token, fullName, ".env.example"),
    ]);

    const stack = this.detectStack({
      packageJson,
      hasNextConfig: nextConfig !== null,
      hasViteConfig: viteConfig !== null,
    });

    const envVars = this.extractEnvVariables(envExample);

    logger.info("Repository analysis complete", { fullName, stack });

    return { stack, envVars };
  }

  private detectStack(params: {
    packageJson: string | null;
    hasNextConfig: boolean;
    hasViteConfig: boolean;
  }): DetectedStack {
    let frontend: DetectedStack["frontend"] = null;
    let backend: DetectedStack["backend"] = null;
    let packageManager: DetectedStack["packageManager"] = "npm";
    let buildCommand: string | null = null;
    let outputDir: string | null = null;
    let nodeVersion: string | null = null;

    if (params.packageJson) {
      try {
        const pkg = JSON.parse(params.packageJson) as {
          dependencies?: Record<string, string>;
          devDependencies?: Record<string, string>;
          engines?: { node?: string };
        };
        const deps = {
          ...pkg.dependencies,
          ...pkg.devDependencies,
        };

        if (params.hasNextConfig || deps["next"]) {
          frontend = "NEXTJS";
          buildCommand = "npm run build";
          outputDir = ".next";
        } else if (params.hasViteConfig || deps["vite"]) {
          frontend = "REACT_VITE";
          buildCommand = "npm run build";
          outputDir = "dist";
        }

        if (deps["fastify"]) {
          backend = "FASTIFY";
        } else if (deps["express"]) {
          backend = "EXPRESS";
        }

        if (pkg.engines?.node) {
          nodeVersion = pkg.engines.node.replace(/[^0-9.]/g, "");
        }
      } catch {
        logger.warn("Failed to parse package.json");
      }
    }

    return {
      frontend,
      backend,
      packageManager,
      buildCommand,
      outputDir,
      nodeVersion,
    };
  }

  private extractEnvVariables(envExample: string | null): EnvVariable[] {
    if (!envExample) return [];

    const vars: EnvVariable[] = [];
    const lines = envExample.split("\n");

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const value = trimmed.slice(eqIdx + 1).trim();
      if (key) {
        vars.push({
          key,
          value,
          isRequired: value === "" || value === "REQUIRED",
          source: "dotenv",
        });
      }
    }

    return vars;
  }
}
