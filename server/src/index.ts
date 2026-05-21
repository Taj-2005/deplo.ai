import { env } from "./config/env";
import { logger } from "./shared/logger/logger";
import { PrismaClient } from "@prisma/client";
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

import { UserRepository } from "./infrastructure/database/repositories/UserRepository";
import { DeploymentRepository } from "./infrastructure/database/repositories/DeploymentRepository";
import { getRedisClient, closeRedisClient } from "./infrastructure/redis/RedisClient";
import { CacheService } from "./infrastructure/redis/CacheService";
import { GitHubAdapter } from "./infrastructure/github/GitHubAdapter";
import { VercelAdapter } from "./infrastructure/vercel/VercelAdapter";
import { RenderAdapter } from "./infrastructure/render/RenderAdapter";
import { AuthService } from "./application/services/AuthService";
import { AnalysisService } from "./application/services/AnalysisService";
import { DeploymentService } from "./application/services/DeploymentService";
import { AuthController } from "./interfaces/http/controllers/auth.controller";
import { HealthController } from "./interfaces/http/controllers/health.controller";
import { createAuthMiddleware } from "./interfaces/http/middleware/auth.middleware";
import { asyncHandler } from "./shared/utils/asyncHandler";

async function bootstrap(): Promise<void> {
  // ── Infrastructure ───────────────────────────────────────────────────────
  const prisma = new PrismaClient({ log: env.NODE_ENV === "development" ? ["query"] : [] });
  await prisma.$connect();
  logger.info("Database connected");

  const redis = getRedisClient();
  const cache = new CacheService(redis);

  // ── Repositories ─────────────────────────────────────────────────────────
  const userRepository = new UserRepository(prisma);
  const deploymentRepository = new DeploymentRepository(prisma);

  // ── External Adapters ────────────────────────────────────────────────────
  const github = new GitHubAdapter();
  const vercel = new VercelAdapter();
  const render = new RenderAdapter();

  // ── Application Services ─────────────────────────────────────────────────
  const authService = new AuthService(userRepository, github);
  const analysisService = new AnalysisService(github);

  const repositoryRepository = {
    findById: (id: string) => prisma.repository.findUnique({ where: { id } }),
    findByGithubRepoId: (githubRepoId: string) =>
      prisma.repository.findUnique({ where: { githubRepoId } }),
    findByUserId: (userId: string) =>
      prisma.repository.findMany({ where: { userId } }),
    upsert: (data: Parameters<typeof prisma.repository.upsert>[0]["create"]) =>
      prisma.repository.upsert({
        where: { githubRepoId: (data as { githubRepoId: string }).githubRepoId },
        create: data,
        update: data,
      }),
  };

  const deploymentService = new DeploymentService(
    deploymentRepository,
    userRepository,
    repositoryRepository,
    analysisService,
    vercel,
    render,
    cache,
  );

  const services = {
    prisma,
    userRepository,
    deploymentRepository,
    authService,
    deploymentService,
    cache,
  };

  // ── Express App ──────────────────────────────────────────────────────────
  const app = express();

  app.set("trust proxy", 1);
  app.use(helmet());
  app.use(compression());
  app.use(
    cors({
      origin: env.ALLOWED_ORIGINS,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "1mb" }));

  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use(limiter);

  // ── GraphQL ──────────────────────────────────────────────────────────────
  const apollo = new ApolloServer({ typeDefs, resolvers });
  await apollo.start();

  app.use(
    "/graphql",
    expressMiddleware(apollo, {
      context: async ({ req }) => buildContext(req, services),
    }),
  );

  // ── REST Routes ──────────────────────────────────────────────────────────
  const apiRouter = express.Router();
  const authController = new AuthController(authService);
  const healthController = new HealthController(prisma, redis);
  const authMiddleware = createAuthMiddleware(authService);

  apiRouter.get("/health", asyncHandler(healthController.check));
  apiRouter.get("/auth/github", authController.getGithubOAuthUrl);
  apiRouter.get(
    "/auth/github/callback",
    asyncHandler(authController.handleGithubCallback),
  );
  apiRouter.get(
    "/auth/me",
    authMiddleware,
    asyncHandler(authController.getCurrentUser),
  );

  app.use(`/api/${env.API_VERSION}`, apiRouter);

  // ── Swagger ──────────────────────────────────────────────────────────────
  setupSwagger(app);

  // ── Error Handler ────────────────────────────────────────────────────────
  app.use(errorMiddleware);

  // ── Start ────────────────────────────────────────────────────────────────
  const server = app.listen(env.PORT, () => {
    logger.info(`🚀 Server running on http://localhost:${env.PORT}`);
    logger.info(`📊 GraphQL: http://localhost:${env.PORT}/graphql`);
    logger.info(`📖 API Docs: http://localhost:${env.PORT}/docs`);
  });

  // ── Graceful Shutdown ────────────────────────────────────────────────────
  const shutdown = async (signal: string): Promise<void> => {
    logger.info(`${signal} received — shutting down gracefully`);
    server.close(() => {
      void (async () => {
        await prisma.$disconnect();
        await closeRedisClient();
        logger.info("Server closed");
        process.exit(0);
      })();
    });
  };

  process.on("SIGTERM", () => {
    void shutdown("SIGTERM");
  });
  process.on("SIGINT", () => {
    void shutdown("SIGINT");
  });
}

bootstrap().catch((err: unknown) => {
  logger.error("Failed to start server", { error: (err as Error).message });
  process.exit(1);
});
