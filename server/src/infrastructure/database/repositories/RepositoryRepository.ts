import type { PrismaClient } from "@prisma/client";
import type { IRepositoryRepository, Repository } from "../../../domain/repository/Repository";

export class RepositoryRepository implements IRepositoryRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<Repository | null> {
    return this.prisma.repository.findUnique({ where: { id } }) as Promise<Repository | null>;
  }

  async findByGithubRepoId(githubRepoId: string): Promise<Repository | null> {
    return this.prisma.repository.findUnique({ where: { githubRepoId } }) as Promise<Repository | null>;
  }

  async findByUserId(userId: string): Promise<Repository[]> {
    return this.prisma.repository.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
    }) as Promise<Repository[]>;
  }

  async upsert(data: Omit<Repository, "id" | "createdAt" | "updatedAt">): Promise<Repository> {
    return this.prisma.repository.upsert({
      where: { githubRepoId: data.githubRepoId },
      create: data,
      update: {
        name: data.name,
        fullName: data.fullName,
        htmlUrl: data.htmlUrl,
        cloneUrl: data.cloneUrl,
        defaultBranch: data.defaultBranch,
        isPrivate: data.isPrivate,
        language: data.language,
        description: data.description,
      },
    }) as Promise<Repository>;
  }
}
