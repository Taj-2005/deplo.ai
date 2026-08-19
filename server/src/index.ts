import { env } from "./config/env";
import { logger } from "./shared/logger/logger";
import { PrismaClient } from "@prisma/client";
import Redis from "ioredis";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";

import { errorMiddleware } from "./interfaces/http/middleware/error.middleware";
import { setupSwagger } from "./interfaces/swagger/swagger";

// ── Repositories ──────────────────────────────────────────────────────────────
import { UserRepository } from "./infrastructure/database/repositories/UserRepository";
import { DeploymentRepository } from "./infrastructure/database/repositories/DeploymentRepository";
import { RepositoryRepository } from "./infrastructure/database/repositories/RepositoryRepository";
import { ProviderConnectionRepository } from "./infrastructure/database/repositories/ProviderConnectionRepository";

// ── Infrastructure ────────────────────────────────────────────────────────────
import { CacheService } from "./infrastructure/redis/CacheService";
import { GitHubAdapter } from "./infrastructure/github/GitHubAdapter";
import { getDeploymentQueue } from "./infrastructure/queue/DeploymentQueue";
import { createDeploymentWorker } from "./infrastructure/queue/DeploymentWorker";
import { startMonitoring } from "./infrastructure/queue/MonitoringWorker";

// ── Application Services ──────────────────────────────────────────────────────
import { AuthService } from "./application/services/AuthService";
import { AnalysisService } from "./application/services/AnalysisService";
import { GroqReasoningService } from "./application/analysis/GroqReasoningService";
import { GroqClient } from "./infrastructure/groq/GroqClient";
import { DeploymentService } from "./application/services/DeploymentService";
import { RepositoryService } from "./application/services/RepositoryService";
import { IntegrationService } from "./application/services/IntegrationService";
import { DeploymentOrchestrator } from "./application/orchestration/DeploymentOrchestrator";
import { DeploymentEmailService } from "./application/notifications/DeploymentEmailService";
import { SmtpMailer } from "./infrastructure/email/SmtpMailer";

// ── HTTP Controllers ──────────────────────────────────────────────────────────
import { AuthController } from "./interfaces/http/controllers/auth.controller";
import { HealthController } from "./interfaces/http/controllers/health.controller";
import { ReposController } from "./interfaces/http/controllers/repos.controller";
import { DeploymentsController } from "./interfaces/http/controllers/deployments.controller";
import { StatsController } from "./interfaces/http/controllers/stats.controller";
import { WebhooksController } from "./interfaces/http/controllers/webhooks.controller";
import { IntegrationsController } from "./interfaces/http/controllers/integrations.controller";
import { MonitoringController } from "./interfaces/http/controllers/monitoring.controller";
import { CliTokensController } from "./interfaces/http/controllers/cli-tokens.controller";
import { FeedbackController } from "./interfaces/http/controllers/feedback.controller";
import { CliTokenService } from "./application/services/CliTokenService";
import { createAuthMiddleware } from "./interfaces/http/middleware/auth.middleware";
import { asyncHandler } from "./shared/utils/asyncHandler";

async function bootstrap(): Promise<void> {
  // ── Database ─────────────────────────────────────────────────────────────
  const prisma = new PrismaClient({ log: env.NODE_ENV === "development" ? ["query"] : [] });
  await prisma.$connect();
  logger.info("Database connected");

  // ── Redis ─────────────────────────────────────────────────────────────────
  const cacheRedis = new Redis(env.REDIS_URL, { maxRetriesPerRequest: 3 });
  const workerRedis = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
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
  const providerConnectionRepository = new ProviderConnectionRepository(prisma);

  // ── External adapters ─────────────────────────────────────────────────────
  const github = new GitHubAdapter();

  // ── Application services ──────────────────────────────────────────────────
  const repositoryService = new RepositoryService(repositoryRepository, github, cache);
  const authService = new AuthService(userRepository, repositoryRepository, github, cache);

  // Layer 3 AI reasoning (optional — deterministic-only when no Groq keys).
  const groqTokens = [env.GROQ_API_TOKEN_1, env.GROQ_API_TOKEN_2].filter(Boolean);
  const reasoning = groqTokens.length
    ? new GroqReasoningService(new GroqClient(groqTokens, env.GROQ_MODEL))
    : null;
  logger.info(reasoning ? `Groq AI reasoning enabled (${env.GROQ_MODEL}, ${groqTokens.length} key(s))` : "Groq AI reasoning disabled (no keys)");

  const analysisService = new AnalysisService(github, reasoning, cache);

  // Deployment lifecycle emails (soft-off until SMTP env vars are set).
  const mailer = new SmtpMailer();
  const emailService = new DeploymentEmailService(mailer);
  logger.info(mailer.isConfigured() ? "Deployment emails enabled" : "Deployment emails disabled (SMTP not configured)");

  const integrationService = new IntegrationService(providerConnectionRepository, {
    vercelClientId: env.VERCEL_CLIENT_ID,
    vercelClientSecret: env.VERCEL_CLIENT_SECRET,
    vercelIntegrationSlug: env.VERCEL_INTEGRATION_SLUG,
    publicUrl: env.PUBLIC_URL ?? "",
    jwtSecret: env.JWT_SECRET,
  });

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
    integrationService,
    github,
    reasoning,
    emailService,
  );

  const worker = createDeploymentWorker(workerRedis, orchestrator);
  logger.info("Deployment worker started");

  startMonitoring(workerRedis, prisma);
  logger.info("Uptime monitoring started (5-minute probes)");

  // ── Express app ───────────────────────────────────────────────────────────
  const app = express();

  app.set("trust proxy", 1);
  app.use(helmet());
  app.use(compression());
  // Browser traffic reaches this server via the frontend's Next.js rewrite proxy
  // (same-origin to the user), so CORS is a secondary safeguard for any direct
  // access. Keep the allowlist tight; auth uses Bearer tokens, not cookies.
  app.use(cors({ origin: env.ALLOWED_ORIGINS, credentials: true }));
  app.use(express.json({ limit: "1mb" }));

  const limiter = rateLimit({
    windowMs: 15 * 60 * 1_000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use(limiter);

  // ── REST API ──────────────────────────────────────────────────────────────
  const api = express.Router();
  const cliTokenService = new CliTokenService(prisma);
  const authMiddleware = createAuthMiddleware(authService, cliTokenService);

  const authController = new AuthController(authService, userRepository);
  const healthController = new HealthController(prisma, cacheRedis);
  const reposController = new ReposController(repositoryService, userRepository, repositoryRepository, analysisService);
  const deploymentsController = new DeploymentsController(
    deploymentService,
    deploymentRepository,
    prisma,
  );
  const statsController = new StatsController(prisma);
  const webhooksController = new WebhooksController(
    deploymentRepository,
    repositoryRepository,
    deploymentQueue,
    integrationService,
    cache,
  );
  const integrationsController = new IntegrationsController(integrationService);
  const monitoringController = new MonitoringController(prisma, integrationService);
  const cliTokensController = new CliTokensController(cliTokenService);
  const feedbackController = new FeedbackController(userRepository, mailer);

  // ── Public routes ─────────────────────────────────────────────────────────
  api.get("/health", asyncHandler(healthController.check));
  api.get("/auth/github", authController.getGithubOAuthUrl);
  api.get("/auth/github/callback", asyncHandler(authController.handleGithubCallback));

  // Vercel OAuth callback — public (user identified via signed JWT state param)
  api.get("/integrations/vercel/callback", asyncHandler(integrationsController.vercelCallback));

  // Landing-page platform stats — public, cached, no auth.
  api.get("/public/stats", asyncHandler(statsController.publicStats));

  // Webhooks — no user auth (signature validation inside controllers)
  api.get("/public/insights.js", monitoringController.script);
  api.get("/public/insights/:repoId", asyncHandler(monitoringController.ingest));
  api.post("/public/insights/:repoId", asyncHandler(monitoringController.ingest));

  api.post("/webhooks/vercel", asyncHandler(webhooksController.vercel));
  api.post("/webhooks/github", asyncHandler(webhooksController.github));

  // ── Protected routes ──────────────────────────────────────────────────────
  api.use(authMiddleware);
  api.get("/auth/me", asyncHandler(authController.getCurrentUser));
  api.delete("/auth/me", asyncHandler(authController.deleteAccount));

  api.get("/repos", asyncHandler(reposController.list));
  api.get("/repos/:id/analyze", asyncHandler(reposController.analyzeStack));
  api.post("/repos/sync", asyncHandler(reposController.sync));

  api.get("/deployments", asyncHandler(deploymentsController.list));
  api.post("/deployments", asyncHandler(deploymentsController.start));
  api.get("/deployments/:id", asyncHandler(deploymentsController.get));
  api.post("/deployments/:id/env", asyncHandler(deploymentsController.provideEnv));
  api.delete("/deployments/:id", asyncHandler(deploymentsController.cancel));

  api.get("/integrations", asyncHandler(integrationsController.list));
  api.get("/integrations/vercel/install-url", integrationsController.vercelInstallUrl);
  api.delete("/integrations/vercel", asyncHandler(integrationsController.vercelDisconnect));
  api.post("/integrations/render", asyncHandler(integrationsController.renderConnect));
  api.delete("/integrations/render", asyncHandler(integrationsController.renderDisconnect));

  api.get("/projects/:repoId/monitoring", asyncHandler(monitoringController.monitoring));
  api.get("/projects/:repoId/analytics", asyncHandler(monitoringController.analytics));

  api.post("/cli-tokens", asyncHandler(cliTokensController.create));
  api.get("/cli-tokens", asyncHandler(cliTokensController.list));
  api.delete("/cli-tokens/:id", asyncHandler(cliTokensController.revoke));

  api.post("/feedback", asyncHandler(feedbackController.submit));

  api.get("/stats", asyncHandler(statsController.get));

  app.use(`/api/${env.API_VERSION}`, api);

  // ── Swagger ───────────────────────────────────────────────────────────────
  // Disabled in production (unauthenticated docs — not exposed publicly).
  const docsMounted = setupSwagger(app);

  // ── Error handler ─────────────────────────────────────────────────────────
  app.use(errorMiddleware);

  // ── Start ─────────────────────────────────────────────────────────────────
  const server = app.listen(env.PORT, () => {
    logger.info(`Server running on http://localhost:${env.PORT}`);
    logger.info(`REST:     http://localhost:${env.PORT}/api/${env.API_VERSION}`);
    if (docsMounted) {
      logger.info(`API Docs: http://localhost:${env.PORT}/docs`);
    } else {
      logger.info("API Docs: disabled in production");
    }
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
