import { AuthController } from "../auth.controller";
import { AppError } from "../../../../shared/errors/AppError";
import type { Request, Response, NextFunction } from "express";
import type { IUserRepository } from "../../../../domain/user/UserRepository.interface";
import type { AuthService } from "../../../../application/services/AuthService";

/**
 * Account deletion is destructive and legally load-bearing (right to erasure),
 * so its contract is pinned: it deletes exactly the caller's own account and
 * answers 204.
 */
describe("AuthController.deleteAccount", () => {
  function setup() {
    const userRepository = {
      findById: jest.fn(),
      findByGithubId: jest.fn(),
      findByEmail: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn().mockResolvedValue(undefined),
    } as unknown as IUserRepository & { delete: jest.Mock };

    const res = {
      status: jest.fn().mockReturnThis(),
      end: jest.fn(),
      json: jest.fn(),
    } as unknown as Response & { status: jest.Mock; end: jest.Mock };

    const next = jest.fn() as NextFunction & jest.Mock;
    const controller = new AuthController({} as AuthService, userRepository);
    return { controller, userRepository, res, next };
  }

  it("deletes the authenticated user and returns 204", async () => {
    const { controller, userRepository, res, next } = setup();

    await controller.deleteAccount({ userId: "user_123" } as Request, res, next);

    expect(userRepository.delete).toHaveBeenCalledWith("user_123");
    expect(userRepository.delete).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(204);
    expect(res.end).toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it("never deletes an id other than the caller's", async () => {
    const { controller, userRepository, res, next } = setup();

    // A spoofed body must not influence which account is removed.
    await controller.deleteAccount(
      { userId: "user_123", body: { userId: "victim_456" } } as Request,
      res,
      next,
    );

    expect(userRepository.delete).toHaveBeenCalledWith("user_123");
    expect(userRepository.delete).not.toHaveBeenCalledWith("victim_456");
  });

  it("forwards failures to the error middleware instead of reporting success", async () => {
    const { controller, userRepository, res, next } = setup();
    const boom = AppError.internal("database unavailable");
    (userRepository.delete as jest.Mock).mockRejectedValueOnce(boom);

    await controller.deleteAccount({ userId: "user_123" } as Request, res, next);

    expect(next).toHaveBeenCalledWith(boom);
    expect(res.status).not.toHaveBeenCalledWith(204);
  });
});
