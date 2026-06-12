export interface Repository {
  id: string;
  userId: string;
  githubRepoId: string;
  name: string;
  fullName: string;
  htmlUrl: string;
  cloneUrl: string;
  defaultBranch: string;
  isPrivate: boolean;
  language: string | null;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IRepositoryRepository {
  findById(id: string): Promise<Repository | null>;
  findByFullName(fullName: string): Promise<Repository | null>;
  findByGithubRepoId(githubRepoId: string): Promise<Repository | null>;
  findByUserId(userId: string): Promise<Repository[]>;
  upsert(
    data: Omit<Repository, "id" | "createdAt" | "updatedAt">,
  ): Promise<Repository>;
}
