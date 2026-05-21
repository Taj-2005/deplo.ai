import { DateTimeResolver, JSONResolver } from "graphql-scalars";
import type { GraphQLContext } from "../context/context";
import { AppError } from "../../../shared/errors/AppError";

function requireAuth(ctx: GraphQLContext) {
  if (!ctx.currentUser) throw AppError.unauthorized();
  return ctx.currentUser;
}

export const resolvers = {
  DateTime: DateTimeResolver,
  JSON: JSONResolver,

  Query: {
    me: (_: unknown, __: unknown, ctx: GraphQLContext) => {
      return ctx.currentUser ?? null;
    },

    myRepositories: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      const cacheKey = ctx.cache.buildKey("repos", user.id);
      const cached = await ctx.cache.get<unknown[]>(cacheKey);
      if (cached) return cached;
      const repos = await ctx.prisma.repository.findMany({
        where: { userId: user.id },
        orderBy: { updatedAt: "desc" },
      });
      await ctx.cache.set(cacheKey, repos, 300);
      return repos;
    },

    myDeployments: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      return ctx.deploymentService.listUserDeployments(user.id);
    },

    deployment: async (
      _: unknown,
      { id }: { id: string },
      ctx: GraphQLContext,
    ) => {
      const user = requireAuth(ctx);
      return ctx.deploymentService.getDeployment(id, user.id);
    },
  },

  Mutation: {
    githubLogin: async (
      _: unknown,
      { code }: { code: string },
      ctx: GraphQLContext,
    ) => {
      return ctx.authService.loginWithGithub(code);
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
      {
        input,
      }: {
        input: {
          deploymentId: string;
          envVars: Array<{ key: string; value: string }>;
        };
      },
      ctx: GraphQLContext,
    ) => {
      const user = requireAuth(ctx);
      return ctx.deploymentService.provideEnvVariables(
        input.deploymentId,
        user.id,
        input.envVars.map((v) => ({
          ...v,
          isRequired: false,
          source: "dotenv" as const,
        })),
      );
    },

    cancelDeployment: async (
      _: unknown,
      { id }: { id: string },
      ctx: GraphQLContext,
    ) => {
      const user = requireAuth(ctx);
      const deployment = await ctx.deploymentService.getDeployment(id, user.id);
      if (deployment.status === "COMPLETED" || deployment.status === "FAILED") {
        throw AppError.conflict("Cannot cancel a finished deployment");
      }
      return ctx.deploymentRepository.update(id, { status: "CANCELLED" });
    },
  },

  User: {
    deployments: (parent: { id: string }, _: unknown, ctx: GraphQLContext) =>
      ctx.deploymentRepository.findByUserId(parent.id),

    repositories: (parent: { id: string }, _: unknown, ctx: GraphQLContext) =>
      ctx.prisma.repository.findMany({ where: { userId: parent.id } }),
  },

  Deployment: {
    repository: (parent: { repositoryId: string }, _: unknown, ctx: GraphQLContext) =>
      ctx.prisma.repository.findUniqueOrThrow({
        where: { id: parent.repositoryId },
      }),

    user: (parent: { userId: string }, _: unknown, ctx: GraphQLContext) =>
      ctx.userRepository.findById(parent.userId),
  },

  Repository: {
    deployments: (parent: { id: string }, _: unknown, ctx: GraphQLContext) =>
      ctx.deploymentRepository.findByRepositoryId(parent.id),
  },
};
