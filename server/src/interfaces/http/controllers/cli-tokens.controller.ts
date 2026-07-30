import type { Request, Response } from "express";
import type { CliTokenService } from "../../../application/services/CliTokenService";

/**
 * CLI token management (all authenticated):
 * - POST   /cli-tokens      create — returns the raw token ONCE
 * - GET    /cli-tokens      list (names + usage, never the token)
 * - DELETE /cli-tokens/:id  revoke
 */
export class CliTokensController {
  constructor(private readonly cliTokenService: CliTokenService) {}

  create = async (req: Request, res: Response): Promise<void> => {
    const { name } = (req.body ?? {}) as { name?: string };
    const created = await this.cliTokenService.createToken(req.userId!, String(name ?? ""));
    res.status(201).json(created);
  };

  list = async (req: Request, res: Response): Promise<void> => {
    const tokens = await this.cliTokenService.listTokens(req.userId!);
    res.json({ tokens });
  };

  revoke = async (req: Request, res: Response): Promise<void> => {
    await this.cliTokenService.revokeToken(req.userId!, req.params["id"] as string);
    res.status(204).end();
  };
}
