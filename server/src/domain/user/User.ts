export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  githubId: string;
  githubLogin: string;
  githubAccessToken: string;
  createdAt: Date;
  updatedAt: Date;
}

export type CreateUserInput = Omit<User, "id" | "createdAt" | "updatedAt">;

export type UpdateUserInput = Partial<
  Pick<User, "name" | "avatarUrl" | "githubAccessToken">
>;
