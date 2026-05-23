import { DateTimeResolver, JSONResolver } from "graphql-scalars";
import type { GraphQLContext } from "../context/context";
import type { Deployment, DetectedStack } from "../../../domain/deployment/Deployment";
import { AppError } from "../../../shared/errors/AppError";

function requireAuth(ctx: GraphQLContext): NonNullable<GraphQLContext["currentUser"]> {
  if (!ctx.currentUser) throw AppError.unauthorized();
  return ctx.currentUser;
}

const STACK_LABELS: Record<string, string> = {
  NEXTJS: "Next.js",
  REACT_VITE: "React (Vite)",
  EXPRESS: "Express.js",
  FASTIFY: "Fastify",
  UNKNOWN: "Unknown",
};

function calcDuration(dep: Deployment): number | null {
  if (!dep.completedAt) return null;
  return Math.round((dep.completedAt.getTime() - dep.createdAt.getTime()) / 1000);
}

export const resolvers = {
  DateTime: DateTimeResolver,
  JSON: JSONResolver,

  Query: {
    me: (_: unknown, __: unknown, ctx: GraphQLContext) => ctx.currentUser ?? null,

    myRepositories: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      return ctx.repositoryService.listUserRepositories(user.id);
    },

    myDeployments: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      return ctx.deploymentService.listUserDeployments(user.id);
    },

    deployment: async (_: unknown, { id }: { id: string }, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      return ctx.deploymentService.getDeployment(id, user.id);
    },
  },

  Mutation: {
    githubLogin: async (_: unknown, { code }: { code: string }, ctx: GraphQLContext) => {
      return ctx.authService.loginWithGithub(code);
    },

    syncRepositories: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      const dbUser = await ctx.userRepository.findById(user.id);
      if (!dbUser) throw AppError.notFound("User");
      await ctx.repositoryService.syncUserRepositories(user.id, dbUser.githubAccessToken);
      const repos = await ctx.repositoryService.listUserRepositories(user.id);
      return { synced: repos.length };
    },

    startDeployment: async (
      _: unknown,
      { input }: { input: { repositoryId: string } },
      ctx: GraphQLContext,
    ) => {
      const user = requireAuth(ctx);
      return ctx.deploymentService.startDeployment({
        userId: user.id,
        repositoryId: input.repositoryId,
      });
    },

    provideEnvVariables: async (
      _: unknown,
      { input }: { input: { deploymentId: string; envVars: Array<{ key: string; value: string }> } },
      ctx: GraphQLContext,
    ) => {
      const user = requireAuth(ctx);
      return ctx.deploymentService.provideEnvVariables(
        input.deploymentId,
        user.id,
        input.envVars.map((v) => ({ ...v, isRequired: false, source: "dotenv" as const })),
      );
    },

    cancelDeployment: async (_: unknown, { id }: { id: string }, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      return ctx.deploymentService.cancelDeployment(id, user.id);
    },
  },

  User: {
    deployments: (parent: { id: string }, _: unknown, ctx: GraphQLContext) =>
      ctx.deploymentRepository.findByUserId(parent.id),

    repositories: (parent: { id: string }, _: unknown, ctx: GraphQLContext) =>
      ctx.repositoryService.listUserRepositories(parent.id),
  },

  Deployment: {
    repository: (parent: { repositoryId: string }, _: unknown, ctx: GraphQLContext) =>
      ctx.prisma.repository.findUniqueOrThrow({ where: { id: parent.repositoryId } }),

    user: (parent: { userId: string }, _: unknown, ctx: GraphQLContext) =>
      ctx.userRepository.findById(parent.userId),

    detectedStack: (parent: Deployment) => {
      const s = parent.detectedStack as DetectedStack | null;
      if (!s) return null;
      return {
        ...s,
        frontend: s.frontend ? (STACK_LABELS[s.frontend] ?? s.frontend) : null,
        backend: s.backend ? (STACK_LABELS[s.backend] ?? s.backend) : null,
      };
    },

    envVariables: (parent: Deployment) =>
      parent.envVariables.map((v) => ({ key: v.key, isRequired: v.isRequired })),

    duration: (parent: Deployment) => calcDuration(parent),
  },

  Repository: {
    deployments: (parent: { id: string }, _: unknown, ctx: GraphQLContext) =>
      ctx.deploymentRepository.findByRepositoryId(parent.id),
  },
};
