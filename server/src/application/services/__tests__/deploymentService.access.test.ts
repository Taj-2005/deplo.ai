import { DeploymentService } from "../DeploymentService";
import { AppError } from "../../../shared/errors/AppError";
import type { IDeploymentRepository } from "../../../domain/deployment/DeploymentRepository.interface";
import type { IUserRepository } from "../../../domain/user/UserRepository.interface";
import type { IRepositoryRepository } from "../../../domain/repository/Repository";
import type { CacheService } from "../../../infrastructure/redis/CacheService";

/**
 * Access control and state guards on deployments.
 *
 * These are security properties: a deployment must only ever be readable,
 * cancellable, or env-writable by the user who owns it — including through the
 * cache, which is the easy place to leak one. Terminal deployments must also
 * reject mutation rather than silently accepting it.
 */

const OWNER = "user_owner";
const INTRUDER = "user_intruder";

function makeService(deployment: Record<string, unknown> | null) {
  const deploymentRepository = {
    findById: jest.fn().mockResolvedValue(deployment),
    update: jest.fn().mockImplementation((id, data) => Promise.resolve({ ...deployment, ...data, id })),
    appendLog: jest.fn().mockResolvedValue(undefined),
  } as unknown as IDeploymentRepository & { findById: jest.Mock; update: jest.Mock };

  const cache = {
    buildKey: (...parts: string[]) => parts.join(":"),
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    del: jest.fn().mockResolvedValue(undefined),
    delPattern: jest.fn().mockResolvedValue(undefined),
  } as unknown as CacheService & { get: jest.Mock; set: jest.Mock };

  const service = new DeploymentService(
    deploymentRepository,
    {} as IUserRepository,
    {} as IRepositoryRepository,
    { add: jest.fn().mockResolvedValue(undefined) } as never,
    cache,
  );

  return { service, deploymentRepository, cache };
}

function deploymentIn(status: string) {
  return {
    id: "dep_1",
    userId: OWNER,
    repositoryId: "repo_1",
    branch: "main",
    status,
    envVariables: [{ key: "DATABASE_URL", value: "", isRequired: true, source: "process_env" }],
    logs: [],
  };
}

describe("DeploymentService — access control", () => {
  it("returns the deployment to its owner", async () => {
    const { service } = makeService(deploymentIn("DEPLOYING_BACKEND"));

    await expect(service.getDeployment("dep_1", OWNER)).resolves.toMatchObject({ id: "dep_1" });
  });

  it("refuses to hand another user's deployment over", async () => {
    const { service } = makeService(deploymentIn("DEPLOYING_BACKEND"));

    await expect(service.getDeployment("dep_1", INTRUDER)).rejects.toMatchObject({
      statusCode: AppError.forbidden().statusCode,
    });
  });

  it("does not serve a cached deployment to a different user", async () => {
    // The cache is keyed by deployment id alone, so a hit must still be
    // ownership-checked or one user's data leaks to the next caller.
    const { service, cache, deploymentRepository } = makeService(deploymentIn("ANALYZING"));
    (cache.get as jest.Mock).mockResolvedValueOnce(deploymentIn("ANALYZING"));

    await expect(service.getDeployment("dep_1", INTRUDER)).rejects.toMatchObject({
      statusCode: AppError.forbidden().statusCode,
    });
    // It fell through to the database rather than trusting the cached copy.
    expect(deploymentRepository.findById).toHaveBeenCalled();
  });

  it("reports a missing deployment as not found", async () => {
    const { service } = makeService(null);

    await expect(service.getDeployment("nope", OWNER)).rejects.toMatchObject({
      statusCode: AppError.notFound("Deployment").statusCode,
    });
  });

  it("never caches a finished deployment", async () => {
    const { service, cache } = makeService(deploymentIn("COMPLETED"));

    await service.getDeployment("dep_1", OWNER);

    expect(cache.set).not.toHaveBeenCalled();
  });
});

describe("DeploymentService — state guards", () => {
  it("cancels a running deployment", async () => {
    const { service, deploymentRepository } = makeService(deploymentIn("DEPLOYING_BACKEND"));

    const result = await service.cancelDeployment("dep_1", OWNER);

    expect(result.status).toBe("CANCELLED");
    expect(deploymentRepository.update).toHaveBeenCalledWith(
      "dep_1",
      expect.objectContaining({ status: "CANCELLED" }),
    );
  });

  it("refuses to cancel a deployment that already finished", async () => {
    const { service, deploymentRepository } = makeService(deploymentIn("COMPLETED"));

    await expect(service.cancelDeployment("dep_1", OWNER)).rejects.toMatchObject({
      statusCode: AppError.conflict("x").statusCode,
    });
    expect(deploymentRepository.update).not.toHaveBeenCalled();
  });

  it("refuses cancellation by a non-owner", async () => {
    const { service, deploymentRepository } = makeService(deploymentIn("ANALYZING"));

    await expect(service.cancelDeployment("dep_1", INTRUDER)).rejects.toMatchObject({
      statusCode: AppError.forbidden().statusCode,
    });
    expect(deploymentRepository.update).not.toHaveBeenCalled();
  });

  it("only accepts env variables while the deployment is waiting for them", async () => {
    const { service } = makeService(deploymentIn("DEPLOYING_BACKEND"));

    await expect(
      service.provideEnvVariables("dep_1", OWNER, [{ key: "DATABASE_URL", value: "x", isRequired: true, source: "process_env" as const }]),
    ).rejects.toMatchObject({ statusCode: AppError.conflict("x").statusCode });
  });

  it("refuses env variables from a non-owner", async () => {
    const { service, deploymentRepository } = makeService(deploymentIn("WAITING_FOR_ENV"));

    await expect(
      service.provideEnvVariables("dep_1", INTRUDER, [{ key: "DATABASE_URL", value: "x", isRequired: true, source: "process_env" as const }]),
    ).rejects.toMatchObject({ statusCode: AppError.forbidden().statusCode });
    expect(deploymentRepository.update).not.toHaveBeenCalled();
  });
});
