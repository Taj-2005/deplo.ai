import type { User, CreateUserInput, UpdateUserInput } from "./User";

export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByGithubId(githubId: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  create(input: CreateUserInput): Promise<User>;
  update(id: string, input: UpdateUserInput): Promise<User>;
}
