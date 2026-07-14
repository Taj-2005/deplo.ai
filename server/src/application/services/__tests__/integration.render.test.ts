import { IntegrationService } from "../IntegrationService";
import type { IProviderConnectionRepository } from "../../../domain/provider/ProviderConnectionRepository.interface";
import type { ProviderConnection, UpsertProviderConnectionInput } from "../../../domain/provider/ProviderConnection";
import type { RenderOwner } from "../../../infrastructure/render/RenderApiClient";
import { AppError } from "../../../shared/errors/AppError";

// Deterministic 64-hex key so encrypt/decrypt work in tests.
process.env["ENCRYPTION_KEY"] = "a".repeat(64);

const CONFIG = {
  vercelClientId: "x",
  vercelClientSecret: "x",
  vercelIntegrationSlug: "deplo-ai",
  publicUrl: "https://api.example.com",
  jwtSecret: "test-secret-test-secret-test-secret!!",
};

function fakeRepo(): jest.Mocked<IProviderConnectionRepository> {
  const store = new Map<string, ProviderConnection>();
  return {
    findByUserId: jest.fn(async (userId: string) => [...store.values()].filter((c) => c.userId === userId)),
    findByUserAndProvider: jest.fn(async (userId: string, provider: string) => store.get(`${userId}:${provider}`) ?? null),
    findByInstallationId: jest.fn(async () => null),
    upsert: jest.fn(async (input: UpsertProviderConnectionInput) => {
      const conn: ProviderConnection = {
        id: "pc_1",
        userId: input.userId,
        provider: input.provider,
        providerUserId: input.providerUserId ?? null,
        providerTeamId: input.providerTeamId ?? null,
        providerTeamName: input.providerTeamName ?? null,
        providerAccountName: input.providerAccountName ?? null,
        installationId: input.installationId ?? null,
        accessTokenEncrypted: input.accessTokenEncrypted,
        metadata: input.metadata ?? {},
        status: input.status ?? "ACTIVE",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      store.set(`${input.userId}:${input.provider}`, conn);
      return conn;
    }),
    updateStatus: jest.fn(async () => undefined),
    delete: jest.fn(async () => undefined),
  } as unknown as jest.Mocked<IProviderConnectionRepository>;
}

const TEAM_OWNER: RenderOwner = { id: "tea-123", name: "My Workspace", email: "me@example.com", type: "team" };
const USER_OWNER: RenderOwner = { id: "usr-456", name: "Pat", email: "pat@example.com", type: "user" };

describe("IntegrationService — Render", () => {
  it("rejects malformed keys without calling the API or storing anything", async () => {
    const repo = fakeRepo();
    const factory = jest.fn();
    const service = new IntegrationService(repo, CONFIG, factory);

    await expect(service.connectRender("u1", "not-a-key")).rejects.toThrow(/rnd_/);
    await expect(service.connectRender("u1", "   ")).rejects.toThrow(/required/);
    expect(factory).not.toHaveBeenCalled();
    expect(repo.upsert).not.toHaveBeenCalled();
  });

  it("rejects keys the Render API refuses — nothing stored", async () => {
    const repo = fakeRepo();
    const service = new IntegrationService(repo, CONFIG, () => ({
      listOwners: jest.fn().mockRejectedValue(AppError.unauthorized("Invalid Render API key.")),
    }));

    await expect(service.connectRender("u1", "rnd_invalidinvalidinvalid")).rejects.toThrow(/Invalid Render API key/);
    expect(repo.upsert).not.toHaveBeenCalled();
  });

  it("validates, encrypts, and stores a good key (team workspace)", async () => {
    const repo = fakeRepo();
    const service = new IntegrationService(repo, CONFIG, () => ({
      listOwners: jest.fn().mockResolvedValue([TEAM_OWNER]),
    }));

    const conn = await service.connectRender("u1", "rnd_validvalidvalidvalid");

    expect(conn.provider).toBe("RENDER");
    expect(conn.providerTeamId).toBe("tea-123");
    expect(conn.providerAccountName).toBe("My Workspace");
    expect(conn.status).toBe("ACTIVE");
    // Key is encrypted — never stored raw.
    expect(conn.accessTokenEncrypted).not.toContain("rnd_valid");
    expect((conn.metadata as { ownerIds: string[] }).ownerIds).toEqual(["tea-123"]);
  });

  it("prefers the personal workspace when both exist", async () => {
    const repo = fakeRepo();
    const service = new IntegrationService(repo, CONFIG, () => ({
      listOwners: jest.fn().mockResolvedValue([TEAM_OWNER, USER_OWNER]),
    }));

    const conn = await service.connectRender("u1", "rnd_validvalidvalidvalid");
    expect(conn.providerUserId).toBe("usr-456");
    expect(conn.providerTeamId).toBeNull();
  });

  it("resolves decrypted per-user credentials for the deployment engine", async () => {
    const repo = fakeRepo();
    const service = new IntegrationService(repo, CONFIG, () => ({
      listOwners: jest.fn().mockResolvedValue([TEAM_OWNER]),
    }));

    await service.connectRender("u1", "rnd_validvalidvalidvalid");
    const creds = await service.resolveRenderCredentials("u1");

    expect(creds.apiKey).toBe("rnd_validvalidvalidvalid"); // decrypts back to original
    expect(creds.ownerId).toBe("tea-123");
  });

  it("throws a clear error when Render is not connected", async () => {
    const service = new IntegrationService(fakeRepo(), CONFIG, jest.fn());
    await expect(service.resolveRenderCredentials("u1")).rejects.toThrow(/not connected/);
  });
});
