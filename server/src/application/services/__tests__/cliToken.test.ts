import { createHash } from "node:crypto";
import { CliTokenService, CLI_TOKEN_PREFIX } from "../CliTokenService";
import { AppError } from "../../../shared/errors/AppError";

type MockPrisma = {
  cliToken: {
    create: jest.Mock;
    findMany: jest.Mock;
    findUnique: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
};

function makePrisma(): MockPrisma {
  return {
    cliToken: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn().mockResolvedValue({}),
      delete: jest.fn().mockResolvedValue({}),
    },
  };
}

describe("CliTokenService", () => {
  let prisma: MockPrisma;
  let service: CliTokenService;

  beforeEach(() => {
    prisma = makePrisma();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    service = new CliTokenService(prisma as any);
  });

  it("creates a dpl_-prefixed token and stores only its SHA-256 hash", async () => {
    prisma.cliToken.create.mockImplementation(({ data }) =>
      Promise.resolve({ id: "t1", name: data.name, tokenHash: data.tokenHash, createdAt: new Date() }),
    );

    const result = await service.createToken("user1", "  My laptop  ");

    expect(result.token.startsWith(CLI_TOKEN_PREFIX)).toBe(true);
    expect(result.name).toBe("My laptop");
    const stored = prisma.cliToken.create.mock.calls[0][0].data;
    expect(stored.tokenHash).toBe(createHash("sha256").update(result.token).digest("hex"));
    expect(stored.tokenHash).not.toContain(result.token);
  });

  it("rejects an empty token name", async () => {
    await expect(service.createToken("user1", "   ")).rejects.toBeInstanceOf(AppError);
  });

  it("authenticates a valid token and stamps lastUsedAt", async () => {
    prisma.cliToken.findUnique.mockResolvedValue({ id: "t1", userId: "user1" });

    const userId = await service.authenticate("dpl_abc");

    expect(userId).toBe("user1");
    expect(prisma.cliToken.findUnique).toHaveBeenCalledWith({
      where: { tokenHash: createHash("sha256").update("dpl_abc").digest("hex") },
    });
    expect(prisma.cliToken.update).toHaveBeenCalled();
  });

  it("returns null for an unknown token", async () => {
    prisma.cliToken.findUnique.mockResolvedValue(null);
    await expect(service.authenticate("dpl_nope")).resolves.toBeNull();
  });

  it("refuses to revoke a token owned by another user", async () => {
    prisma.cliToken.findUnique.mockResolvedValue({ id: "t1", userId: "someone-else" });
    await expect(service.revokeToken("user1", "t1")).rejects.toBeInstanceOf(AppError);
    expect(prisma.cliToken.delete).not.toHaveBeenCalled();
  });
});
