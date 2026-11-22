import type { PrismaClient } from "@prisma/client";
import { decrypt } from "../../shared/utils/crypto";
import { logger } from "../../shared/logger/logger";

const EXPO_SEND_URL = "https://exp.host/--/api/v2/push/send";
const CATEGORY_BY_TYPE: Record<string, string> = {
  "deployment-completed": "deployment-success",
  "deployment-failed": "deployment-failed",
  "environment-required": "environment-required",
  "project-down": "project-down",
  "project-recovered": "project-recovered",
  "deployment-started": "deployment-success",
};

interface PushMessage {
  to: string;
  title: string;
  body: string;
  sound: "default";
  badge: number;
  data: Record<string, string>;
}

interface ExpoTicket {
  status?: string;
  id?: string;
  details?: { error?: string };
}

interface ExpoReceipt extends ExpoTicket {}

/** Persists in-app history and best-effort dispatches Expo tokens to FCM/APNs. */
export class MobileNotificationService {
  constructor(private readonly prisma: PrismaClient) {}

  async notify(input: {
    userId: string;
    eventId: string;
    type: string;
    title: string;
    body: string;
    projectId: string;
    deploymentId?: string;
  }): Promise<void> {
    const category = CATEGORY_BY_TYPE[input.type];
    if (!category) return;

    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.notificationEvent.create({
          data: { userId: input.userId, eventId: input.eventId, type: input.type },
        });
        await tx.notificationHistory.create({
          data: {
            userId: input.userId,
            type: input.type,
            title: input.title.slice(0, 120),
            body: input.body.slice(0, 240),
            data: {
              route: input.deploymentId ? "deployment" : "monitoring",
              projectId: input.projectId,
              ...(input.deploymentId ? { deploymentId: input.deploymentId } : {}),
            },
          },
        });
      });
    } catch (error) {
      // A duplicate event is expected when queue jobs or webhooks are retried.
      if ((error as { code?: string }).code === "P2002") return;
      logger.warn("Mobile notification could not be persisted", { eventId: input.eventId });
      return;
    }

    try {
      const [preference, devices, unreadCount] = await Promise.all([
        this.prisma.notificationPreference.findUnique({
          where: { userId: input.userId },
          include: { projectOverrides: { where: { repositoryId: input.projectId } } },
        }),
        this.prisma.mobileDevice.findMany({
          where: {
            userId: input.userId,
            registrationStatus: "ACTIVE",
            pushEnabled: true,
            invalidToken: false,
          },
          select: { id: true, pushToken: true },
        }),
        this.prisma.notificationHistory.count({ where: { userId: input.userId, read: false } }),
      ]);
      const override = preference?.projectOverrides[0];
      const globalCategories = preference?.categories as Record<string, boolean> | undefined;
      const projectCategories = override?.categories as Record<string, boolean> | undefined;
      const enabled = preference?.enabled !== false
        && (projectCategories?.[category] ?? globalCategories?.[category] ?? true);
      if (!enabled || devices.length === 0) return;

      const messages: PushMessage[] = devices.map((device) => {
        const storedToken = device.pushToken;
        const token = storedToken.startsWith("enc:v1:")
          ? decrypt(storedToken.slice("enc:v1:".length))
          : storedToken;
        return {
          to: token,
          title: input.title.slice(0, 120),
          body: input.body.slice(0, 240),
          sound: "default",
          badge: unreadCount,
          data: {
            route: input.deploymentId ? "deployment" : "monitoring",
            projectId: input.projectId,
            ...(input.deploymentId ? { deploymentId: input.deploymentId } : {}),
          },
        };
      });
      await this.sendBatch(messages, devices.map((device) => device.id));
    } catch {
      // Notification delivery is best effort and must never fail a deployment.
      logger.warn("Mobile notification dispatch failed", { eventId: input.eventId });
    }
  }

  private async sendBatch(messages: PushMessage[], deviceIds: string[]): Promise<void> {
    for (let offset = 0; offset < messages.length; offset += 100) {
      const chunk = messages.slice(offset, offset + 100);
      const ids = deviceIds.slice(offset, offset + 100);
      let response: Response | undefined;
      for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
          response = await fetch(EXPO_SEND_URL, {
            method: "POST",
            headers: { accept: "application/json", "content-type": "application/json" },
            body: JSON.stringify(chunk),
            signal: AbortSignal.timeout(10_000),
          });
          if (response.ok || (response.status < 500 && response.status !== 429)) break;
        } catch {
          response = undefined;
        }
        if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 250 * 2 ** attempt));
      }

      if (!response?.ok) {
        logger.warn("Expo push provider unavailable", { batchSize: chunk.length, status: response?.status });
        continue;
      }
      const result = await response.json() as { data?: ExpoTicket[] };
      const tickets = result.data ?? [];
      for (const [index, ticket] of tickets.entries()) {
        const deviceId = ids[index];
        if (!deviceId) continue;
        if (ticket.details?.error === "DeviceNotRegistered") {
          await this.prisma.mobileDevice.updateMany({
            where: { id: deviceId },
            data: { invalidToken: true, pushEnabled: false, registrationStatus: "INVALID" },
          });
        } else if (ticket.status === "ok") {
          await this.prisma.mobileDevice.updateMany({
            where: { id: deviceId },
            data: { lastSuccessfulDelivery: new Date() },
          });
          if (ticket.id) {
            await this.prisma.pushReceipt.create({
              data: { deviceId, ticketId: ticket.id },
            }).catch(() => undefined);
          }
        }
      }
    }
  }

  /** Check Expo receipts after its recommended delivery window. */
  async checkReceipts(): Promise<void> {
    const receipts = await this.prisma.pushReceipt.findMany({
      where: { checkedAt: null, createdAt: { lte: new Date(Date.now() - 15 * 60_000) } },
      orderBy: { createdAt: "asc" },
      take: 100,
      select: { id: true, deviceId: true, ticketId: true },
    });
    if (!receipts.length) return;

    let response: Response;
    try {
      response = await fetch("https://exp.host/--/api/v2/push/getReceipts", {
        method: "POST",
        headers: { accept: "application/json", "content-type": "application/json" },
        body: JSON.stringify({ ids: receipts.map((receipt) => receipt.ticketId) }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) return;
    } catch {
      return;
    }

    const result = await response.json() as { data?: Record<string, ExpoReceipt> };
    for (const receipt of receipts) {
      const delivery = result.data?.[receipt.ticketId];
      if (!delivery) continue;
      if (delivery.details?.error === "DeviceNotRegistered") {
        await this.prisma.mobileDevice.updateMany({
          where: { id: receipt.deviceId },
          data: { invalidToken: true, pushEnabled: false, registrationStatus: "INVALID" },
        });
      }
      await this.prisma.pushReceipt.update({
        where: { id: receipt.id },
        data: { checkedAt: new Date() },
      });
    }
  }
}
