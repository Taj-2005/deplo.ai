import type { Request, Response } from "express";
import type { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { AppError } from "../../../shared/errors/AppError";
import { encrypt } from "../../../shared/utils/crypto";

const categories = [
  "deployment-success",
  "deployment-failed",
  "environment-required",
  "project-down",
  "project-recovered",
] as const;

const DeviceSchema = z.object({
  deviceId: z.string().min(16).max(256),
  platform: z.enum(["ios", "android"]),
  deviceName: z.string().trim().min(1).max(120),
  pushToken: z.string().min(1).max(2048),
  pushEnabled: z.boolean(),
});

const PreferencesSchema = z.object({
  enabled: z.boolean(),
  categories: z.record(z.enum(categories), z.boolean()),
  projectOverrides: z.record(z.string().min(1), z.record(z.enum(categories), z.boolean())).default({}),
});

function jsonObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

export class MobileController {
  constructor(private readonly prisma: PrismaClient) {}

  registerDevice = async (req: Request, res: Response): Promise<void> => {
    const parsed = DeviceSchema.safeParse(req.body);
    if (!parsed.success) throw AppError.validation("Invalid device registration");

    const device = await this.prisma.mobileDevice.upsert({
      where: { userId_deviceId: { userId: req.userId!, deviceId: parsed.data.deviceId } },
      create: {
        userId: req.userId!,
        ...parsed.data,
        pushToken: `enc:v1:${encrypt(parsed.data.pushToken)}`,
      },
      update: {
        platform: parsed.data.platform,
        deviceName: parsed.data.deviceName,
        pushToken: `enc:v1:${encrypt(parsed.data.pushToken)}`,
        pushEnabled: parsed.data.pushEnabled,
        registrationStatus: "ACTIVE",
        invalidToken: false,
      },
      select: { deviceId: true },
    });
    res.json({ deviceId: device.deviceId, registered: true });
  };

  listDevices = async (req: Request, res: Response): Promise<void> => {
    const devices = await this.prisma.mobileDevice.findMany({
      where: { userId: req.userId!, registrationStatus: "ACTIVE" },
      select: {
        deviceId: true,
        platform: true,
        deviceName: true,
        pushEnabled: true,
        invalidToken: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: "desc" },
    });
    res.json(devices);
  };

  revokeDevice = async (req: Request, res: Response): Promise<void> => {
    const deviceId = req.params["deviceId"];
    if (!deviceId) throw AppError.notFound("Device");
    const result = await this.prisma.mobileDevice.updateMany({
      where: { userId: req.userId!, deviceId, registrationStatus: "ACTIVE" },
      data: { registrationStatus: "REVOKED", pushEnabled: false },
    });
    if (result.count === 0) throw AppError.notFound("Device");
    res.status(204).end();
  };

  getPreferences = async (req: Request, res: Response): Promise<void> => {
    const preference = await this.prisma.notificationPreference.findUnique({
      where: { userId: req.userId! },
      include: { projectOverrides: { select: { repositoryId: true, categories: true } } },
    });
    res.json({
      enabled: preference?.enabled ?? true,
      categories: jsonObject(preference?.categories),
      projectOverrides: Object.fromEntries(
        (preference?.projectOverrides ?? []).map((override) => [override.repositoryId, jsonObject(override.categories)]),
      ),
    });
  };

  updatePreferences = async (req: Request, res: Response): Promise<void> => {
    const parsed = PreferencesSchema.safeParse(req.body);
    if (!parsed.success) throw AppError.validation("Invalid notification preferences");
    const userId = req.userId!;
    const repositoryIds = Object.keys(parsed.data.projectOverrides);
    if (repositoryIds.length) {
      const count = await this.prisma.repository.count({ where: { id: { in: repositoryIds }, userId } });
      if (count !== repositoryIds.length) throw AppError.forbidden("One or more projects are not owned by the user");
    }

    const preference = await this.prisma.$transaction(async (tx) => {
      const saved = await tx.notificationPreference.upsert({
        where: { userId },
        create: { userId, enabled: parsed.data.enabled, categories: parsed.data.categories },
        update: { enabled: parsed.data.enabled, categories: parsed.data.categories },
      });
      await tx.projectNotificationOverride.deleteMany({
        where: { preferenceId: saved.id, ...(repositoryIds.length ? { repositoryId: { notIn: repositoryIds } } : {}) },
      });
      for (const repositoryId of repositoryIds) {
        const categories = parsed.data.projectOverrides[repositoryId] ?? {};
        await tx.projectNotificationOverride.upsert({
          where: { preferenceId_repositoryId: { preferenceId: saved.id, repositoryId } },
          create: { preferenceId: saved.id, repositoryId, categories },
          update: { categories },
        });
      }
      return saved;
    });
    res.json({
      enabled: preference.enabled,
      categories: jsonObject(preference.categories),
      projectOverrides: parsed.data.projectOverrides,
    });
  };

  listNotifications = async (req: Request, res: Response): Promise<void> => {
    const limit = Math.min(100, Math.max(1, Number(req.query["limit"] ?? 50) || 50));
    const notifications = await this.prisma.notificationHistory.findMany({
      where: { userId: req.userId! },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: { id: true, type: true, title: true, body: true, read: true, createdAt: true, data: true },
    });
    res.json(notifications);
  };
}
