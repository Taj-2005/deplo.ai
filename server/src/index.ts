import { env } from "./config/env";
import { logger } from "./shared/logger/logger";
import { PrismaClient } from "@prisma/client";
import Redis from "ioredis";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";

import { typeDefs } from "./interfaces/graphql/schema/typeDefs";
import { resolvers } from "./interfaces/graphql/resolvers/index";
import { buildContext } from "./interfaces/graphql/context/context";
import { errorMiddleware } from "./interfaces/http/middleware/error.middleware";
import { setupSwagger } from "./interfaces/swagger/swagger";

// ── Repositories ──────────────────────────────────────────────────────────────
import { UserRepository } from "./infrastructure/database/repositories/UserRepository";
import { DeploymentRepository } from "./infrastructure/database/repositories/DeploymentRepository";
import { RepositoryRepository } from "./infrastructure/database/repositories/RepositoryRepository";

// ── Infrastructure ────────────────────────────────────────────────────────────
import { CacheService } from "./infrastructure/redis/CacheService";
import { GitHubAdapter } from "./infrastructure/github/GitHubAdapter";
import { VercelAdapter } from "./infrastructure/vercel/VercelAdapter";
import { getDeploymentQueue } from "./infrastructure/queue/DeploymentQueue";
import { createDeploymentWorker } from "./infrastructure/queue/DeploymentWorker";

// ── Application Services ──────────────────────────────────────────────────────
import { AuthService } from "./application/services/AuthService";
import { AnalysisService } from "./application/services/AnalysisService";
import { DeploymentService } from "./application/services/DeploymentService";
import { RepositoryService } from "./application/services/RepositoryService";
import { DeploymentOrchestrator } from "./application/orchestration/DeploymentOrchestrator";

// ── HTTP Controllers ──────────────────────────────────────────────────────────
import { AuthController } from "./interfaces/http/controllers/auth.controller";
import { HealthController } from "./interfaces/http/controllers/health.controller";
import { ReposController } from "./interfaces/http/controllers/repos.controller";
import { DeploymentsController } from "./interfaces/http/controllers/deployments.controller";
import { StatsController } from "./interfaces/http/controllers/stats.controller";
import { WebhooksController } from "./interfaces/http/controllers/webhooks.controller";
import { createAuthMiddleware } from "./interfaces/http/middleware/auth.middleware";
import { asyncHandler } from "./shared/utils/asyncHandler";

async function bootstrap(): Promise<void> {
  // ── Database ─────────────────────────────────────────────────────────────
  const prisma = new PrismaClient({ log: env.NODE_ENV === "development" ? ["query"] : [] });
  await prisma.$connect();
  logger.info("Database connected");

  // ── Redis ─────────────────────────────────────────────────────────────────
  // Two separate connections: cache (normal) and BullMQ worker (maxRetriesPerRequest: null)
  const cacheRedis = new Redis(env.REDIS_URL, { maxRetriesPerRequest: 3 });
  const workerRedis = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: null, // required by BullMQ
    enableReadyCheck: false,
  });
  cacheRedis.on("connect", () => logger.info("Redis: connected"));
  cacheRedis.on("error", (err: Error) => logger.error("Redis error", { error: err.message }));
  logger.info("Redis clients initialised");

  const cache = new CacheService(cacheRedis);

  // ── Domain repositories ───────────────────────────────────────────────────
  const userRepository = new UserRepository(prisma);
  const deploymentRepository = new DeploymentRepository(prisma);
  const repositoryRepository = new RepositoryRepository(prisma);

  // ── External adapters ─────────────────────────────────────────────────────
  const github = new GitHubAdapter();
  const vercel = new VercelAdapter();

  // ── Application services ──────────────────────────────────────────────────
  const repositoryService = new RepositoryService(repositoryRepository, github, cache);
  const authService = new AuthService(userRepository, repositoryRepository, github, cache);
  const analysisService = new AnalysisService(github);

  // ── BullMQ queue + orchestrator ───────────────────────────────────────────
  const deploymentQueue = getDeploymentQueue(workerRedis);

  const deploymentService = new DeploymentService(
    deploymentRepository,
    userRepository,
    repositoryRepository,
    deploymentQueue,
    cache,
  );

  const orchestrator = new DeploymentOrchestrator(
    deploymentRepository,
    repositoryRepository,
    userRepository,
    analysisService,
    vercel,
    github,
  );

  const worker = createDeploymentWorker(workerRedis, orchestrator);
  logger.info("Deployment worker started");

  // ── Express app ───────────────────────────────────────────────────────────
  const app = express();

  app.set("trust proxy", 1);
  app.use(helmet());
  app.use(compression());
  app.use(cors({ origin: env.ALLOWED_ORIGINS, credentials: true }));
  app.use(express.json({ limit: "1mb" }));

  const limiter = rateLimit({
    windowMs: 15 * 60 * 1_000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use(limiter);

  // ── GraphQL ───────────────────────────────────────────────────────────────
  const apollo = new ApolloServer({ typeDefs, resolvers });
  await apollo.start();

  const graphqlServices = {
    prisma,
    userRepository,
    deploymentRepository,
    authService,
    deploymentService,
    repositoryService,
    cache,
  };

  app.use(
    "/graphql",
    expressMiddleware(apollo, {
      context: async ({ req }) => buildContext(req, graphqlServices),
    }),
  );

  // ── REST API ──────────────────────────────────────────────────────────────
  const api = express.Router();
  const authMiddleware = createAuthMiddleware(authService);

  const authController = new AuthController(authService);
  const healthController = new HealthController(prisma, cacheRedis);
  const reposController = new ReposController(repositoryService, userRepository);
  const deploymentsController = new DeploymentsController(
    deploymentService,
    deploymentRepository,
    prisma,
  );
  const statsController = new StatsController(prisma);
  const webhooksController = new WebhooksController(deploymentRepository, deploymentQueue);

  // Public
  api.get("/health", asyncHandler(healthController.check));
  api.get("/auth/github", authController.getGithubOAuthUrl);
  api.get("/auth/github/callback", asyncHandler(authController.handleGithubCallback));

  // Webhooks (no user auth — signature validation is done inside controllers)
  api.post("/webhooks/vercel", asyncHandler(webhooksController.vercel));

  // Protected
  api.use(authMiddleware);
  api.get("/auth/me", asyncHandler(authController.getCurrentUser));

  api.get("/repos", asyncHandler(reposController.list));
  api.post("/repos/sync", asyncHandler(reposController.sync));

  api.get("/deployments", asyncHandler(deploymentsController.list));
  api.post("/deployments", asyncHandler(deploymentsController.start));
  api.get("/deployments/:id", asyncHandler(deploymentsController.get));
  api.post("/deployments/:id/env", asyncHandler(deploymentsController.provideEnv));
  api.delete("/deployments/:id", asyncHandler(deploymentsController.cancel));

  api.get("/stats", asyncHandler(statsController.get));

  app.use(`/api/${env.API_VERSION}`, api);

  // ── Swagger ───────────────────────────────────────────────────────────────
  setupSwagger(app);

  // ── Error handler ─────────────────────────────────────────────────────────
  app.use(errorMiddleware);

  // ── Start ─────────────────────────────────────────────────────────────────
  const server = app.listen(env.PORT, () => {
    logger.info(`Server running on http://localhost:${env.PORT}`);
    logger.info(`GraphQL:  http://localhost:${env.PORT}/graphql`);
    logger.info(`REST:     http://localhost:${env.PORT}/api/${env.API_VERSION}`);
    logger.info(`API Docs: http://localhost:${env.PORT}/docs`);
  });

  // ── Graceful shutdown ─────────────────────────────────────────────────────
  const shutdown = async (signal: string): Promise<void> => {
    logger.info(`${signal} received — shutting down gracefully`);
    server.close(() => {
      void (async () => {
        await worker.close();
        await deploymentQueue.close();
        await prisma.$disconnect();
        await cacheRedis.quit();
        await workerRedis.quit();
        logger.info("Server closed");
        process.exit(0);
      })();
    });
  };

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
}

bootstrap().catch((err: unknown) => {
  logger.error("Failed to start server", { error: (err as Error).message });
  process.exit(1);
});
