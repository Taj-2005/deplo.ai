import type { Request } from "express";
import type { PrismaClient } from "@prisma/client";
import type { IUserRepository } from "../../../domain/user/UserRepository.interface";
import type { IDeploymentRepository } from "../../../domain/deployment/DeploymentRepository.interface";
import type { AuthService } from "../../../application/services/AuthService";
import type { DeploymentService } from "../../../application/services/DeploymentService";
import type { CacheService } from "../../../infrastructure/redis/CacheService";
import type { User } from "../../../domain/user/User";

export interface GraphQLContext {
  prisma: PrismaClient;
  userRepository: IUserRepository;
  deploymentRepository: IDeploymentRepository;
  authService: AuthService;
  deploymentService: DeploymentService;
  cache: CacheService;
  currentUser: User | null;
}

export async function buildContext(
  req: Request,
  services: Omit<GraphQLContext, "currentUser">,
): Promise<GraphQLContext> {
  let currentUser: User | null = null;

  const authHeader = req.headers.authorization ?? "";
  if (authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    try {
      const payload = services.authService.verifyToken(token);
      currentUser = await services.userRepository.findById(payload.sub);
    } catch {
      // invalid token — context will have currentUser = null
    }
  }

  return { ...services, currentUser };
}
