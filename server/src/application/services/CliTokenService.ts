import type { PrismaClient } from "@prisma/client";
import { createHash, randomBytes } from "node:crypto";
import { AppError } from "../../shared/errors/AppError";

export const CLI_TOKEN_PREFIX = "dpl_";

/**
 * Long-lived, revocable API tokens for the deplo CLI.
 *
 * The raw token (`dpl_<40 hex>`) is returned exactly once at creation; only
 * its SHA-256 hash is persisted, so a database leak never exposes usable
 * credentials. Tokens authenticate the same REST API the dashboard uses —
 * the auth middleware recognises the `dpl_` prefix and resolves the user here
 * instead of verifying a JWT.
 */
export class CliTokenService {
  constructor(private readonly prisma: PrismaClient) {}

  private hash(rawToken: string): string {
    return createHash("sha256").update(rawToken).digest("hex");
  }

  async createToken(userId: string, name: string): Promise<{ id: string; name: string; token: string; createdAt: Date }> {
    const trimmed = name.trim().slice(0, 64);
    if (!trimmed) {
      throw AppError.validation("Token name is required");
    }
    const token = `${CLI_TOKEN_PREFIX}${randomBytes(20).toString("hex")}`;
    const created = await this.prisma.cliToken.create({
      data: { userId, name: trimmed, tokenHash: this.hash(token) },
    });
    return { id: created.id, name: created.name, token, createdAt: created.createdAt };
  }

  async listTokens(userId: string): Promise<Array<{ id: string; name: string; lastUsedAt: Date | null; createdAt: Date }>> {
    const tokens = await this.prisma.cliToken.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, lastUsedAt: true, createdAt: true },
    });
    return tokens;
  }

  async revokeToken(userId: string, tokenId: string): Promise<void> {
    const token = await this.prisma.cliToken.findUnique({ where: { id: tokenId } });
    if (!token || token.userId !== userId) {
      throw AppError.notFound("Token");
    }
    await this.prisma.cliToken.delete({ where: { id: tokenId } });
  }

  /** Resolve a raw `dpl_…` token to its owning userId, or null if unknown. */
  async authenticate(rawToken: string): Promise<string | null> {
    const record = await this.prisma.cliToken.findUnique({ where: { tokenHash: this.hash(rawToken) } });
    if (!record) return null;
    // Best-effort usage stamp — auth must not fail on a write hiccup.
    this.prisma.cliToken
      .update({ where: { id: record.id }, data: { lastUsedAt: new Date() } })
      .catch(() => undefined);
    return record.userId;
  }
}
