import type { PrismaClient } from "@prisma/client";
import type { IUserRepository } from "../../../domain/user/UserRepository.interface";
import type { User, CreateUserInput, UpdateUserInput } from "../../../domain/user/User";

export class UserRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<User | null> {
    const row = await this.prisma.user.findUnique({ where: { id } });
    return row ?? null;
  }

  async findByGithubId(githubId: string): Promise<User | null> {
    const row = await this.prisma.user.findUnique({ where: { githubId } });
    return row ?? null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const row = await this.prisma.user.findUnique({ where: { email } });
    return row ?? null;
  }

  async create(input: CreateUserInput): Promise<User> {
    return this.prisma.user.create({ data: input });
  }

  async update(id: string, input: UpdateUserInput): Promise<User> {
    return this.prisma.user.update({ where: { id }, data: input });
  }
}
