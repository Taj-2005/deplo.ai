import { DeploymentOrchestrator } from "../DeploymentOrchestrator";
import type { IDeploymentRepository } from "../../../domain/deployment/DeploymentRepository.interface";
import type { IRepositoryRepository } from "../../../domain/repository/Repository";
import type { IUserRepository } from "../../../domain/user/UserRepository.interface";
import type { AnalysisService } from "../../services/AnalysisService";
import type { IntegrationService } from "../../services/IntegrationService";
import type { GitHubAdapter } from "../../../infrastructure/github/GitHubAdapter";
import type { DeploymentEmailService } from "../../notifications/DeploymentEmailService";
import type { GroqReasoningService } from "../../analysis/GroqReasoningService";

/**
 * Analysis phase of the deployment pipeline.
 *
 * Every collaborator is injected, so these run without Postgres, Redis, GitHub
 * or any provider. What is pinned here is the behaviour a user feels: what the
 * deployment's status becomes, which env vars are treated as satisfied, and
 * whether a failure is recorded rather than swallowed.
 */

const STACK = {
  frontend: "NEXTJS",
  backend: "EXPRESS",
  frontendPath: "client",
  backendPath: "server",
  buildCommand: "npm run build",
  outputDir: ".next",
  packageManager: "npm",
} as const;

function makeDeployment(overrides: Record<string, unknown> = {}) {
  return {
    id: "dep_1",
    userId: "user_1",
    repositoryId: "repo_1",
    branch: "main",
    status: "PENDING",
    envVariables: [] as Array<{ key: string; value: string; isRequired: boolean }>,
    detectedStack: null,
    ...overrides,
  };
}

function setup(options: {
  envVars?: Array<{ key: string; value: string; isRequired: boolean }>;
  deployment?: Record<string, unknown>;
} = {}) {
  const deployment = makeDeployment(options.deployment);

  const deploymentRepository = {
    findById: jest.fn().mockResolvedValue(deployment),
    update: jest.fn().mockResolvedValue(deployment),
    appendLog: jest.fn().mockResolvedValue(undefined),
  } as unknown as IDeploymentRepository & { update: jest.Mock; appendLog: jest.Mock; findById: jest.Mock };

  const repositoryRepository = {
    findById: jest.fn().mockResolvedValue({ id: "repo_1", fullName: "ada/shop", userId: "user_1" }),
  } as unknown as IRepositoryRepository;

  const userRepository = {
    findById: jest.fn().mockResolvedValue({
      id: "user_1",
      email: "ada@example.com",
      name: "Ada",
      githubLogin: "ada",
      githubAccessToken: "gho_token",
    }),
  } as unknown as IUserRepository;

  const analysisService = {
    analyzeRepository: jest.fn().mockResolvedValue({
      stack: STACK,
      envVars: options.envVars ?? [],
    }),
  } as unknown as AnalysisService & { analyzeRepository: jest.Mock };

  const emails = {
    sendAwaitingEnv: jest.fn().mockResolvedValue(undefined),
    sendFailure: jest.fn().mockResolvedValue(undefined),
    sendSuccess: jest.fn().mockResolvedValue(undefined),
  } as unknown as DeploymentEmailService & { sendAwaitingEnv: jest.Mock; sendFailure: jest.Mock };

  const orchestrator = new DeploymentOrchestrator(
    deploymentRepository,
    repositoryRepository,
    userRepository,
    analysisService,
    {} as IntegrationService,
    {} as GitHubAdapter,
    null as GroqReasoningService | null,
    emails,
  );

  return { orchestrator, deploymentRepository, analysisService, emails };
}

/** The status the orchestrator last wrote. */
function finalStatus(update: jest.Mock): string | undefined {
  const withStatus = update.mock.calls.filter((c) => c[1]?.status);
  return withStatus[withStatus.length - 1]?.[1]?.status;
}

describe("DeploymentOrchestrator — analysis", () => {
  it("moves straight to deploying when nothing is required", async () => {
    const { orchestrator, deploymentRepository } = setup({
      envVars: [{ key: "OPTIONAL_FLAG", value: "", isRequired: false }],
    });

    const result = await orchestrator.runAnalysis("dep_1");

    expect(result.needsEnv).toBe(false);
    expect(finalStatus(deploymentRepository.update as jest.Mock)).toBe("DEPLOYING_BACKEND");
  });

  it("parks the deployment when a required variable has no value", async () => {
    const { orchestrator, deploymentRepository, emails } = setup({
      envVars: [{ key: "DATABASE_URL", value: "", isRequired: true }],
    });

    const result = await orchestrator.runAnalysis("dep_1");

    expect(result.needsEnv).toBe(true);
    expect(finalStatus(deploymentRepository.update as jest.Mock)).toBe("WAITING_FOR_ENV");
    // The user is told, otherwise the deployment stalls invisibly.
    expect(emails.sendAwaitingEnv).toHaveBeenCalledWith(
      expect.objectContaining({ deploymentId: "dep_1", userEmail: "ada@example.com" }),
      ["DATABASE_URL"],
    );
  });

  it("treats a value supplied up front as satisfying a required variable", async () => {
    const { orchestrator, deploymentRepository, emails } = setup({
      envVars: [{ key: "DATABASE_URL", value: "", isRequired: true }],
      deployment: { envVariables: [{ key: "DATABASE_URL", value: "postgres://live", isRequired: true }] },
    });

    const result = await orchestrator.runAnalysis("dep_1");

    expect(result.needsEnv).toBe(false);
    expect(finalStatus(deploymentRepository.update as jest.Mock)).toBe("DEPLOYING_BACKEND");
    expect(emails.sendAwaitingEnv).not.toHaveBeenCalled();

    // The pre-filled value must survive the merge, not be reset to "".
    const merged = (deploymentRepository.update as jest.Mock).mock.calls
      .map((c) => c[1]?.envVariables)
      .filter(Boolean)
      .pop();
    expect(merged).toEqual([
      expect.objectContaining({ key: "DATABASE_URL", value: "postgres://live" }),
    ]);
  });

  it("records the detected stack so later phases and the UI can read it", async () => {
    const { orchestrator, deploymentRepository } = setup();

    await orchestrator.runAnalysis("dep_1");

    const stackWrite = (deploymentRepository.update as jest.Mock).mock.calls
      .map((c) => c[1]?.detectedStack)
      .filter(Boolean)
      .pop();
    expect(stackWrite).toEqual(STACK);
  });

  it("marks the deployment FAILED and notifies when analysis throws", async () => {
    const { orchestrator, deploymentRepository, analysisService, emails } = setup();
    analysisService.analyzeRepository.mockRejectedValueOnce(new Error("GitHub API rate limit exceeded"));

    await expect(orchestrator.runAnalysis("dep_1")).rejects.toThrow("rate limit");

    expect(deploymentRepository.update).toHaveBeenCalledWith(
      "dep_1",
      expect.objectContaining({ status: "FAILED", error: "GitHub API rate limit exceeded" }),
    );
    expect(emails.sendFailure).toHaveBeenCalled();
  });

  it("rejects an unknown deployment id instead of proceeding", async () => {
    const { orchestrator, deploymentRepository } = setup();
    (deploymentRepository.findById as jest.Mock).mockResolvedValueOnce(null);

    await expect(orchestrator.runAnalysis("missing")).rejects.toThrow();
    expect(deploymentRepository.update).not.toHaveBeenCalled();
  });
});
