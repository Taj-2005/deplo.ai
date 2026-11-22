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
      const historyId = await this.prisma.$transaction(async (tx) => {
        await tx.notificationEvent.create({
          data: { userId: input.userId, eventId: input.eventId, type: input.type },
        });
        const history = await tx.notificationHistory.create({
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
        return history.id;
      });
      const [preference, devices] = await Promise.all([
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
          select: { id: true },
        }),
      ]);
      const override = preference?.projectOverrides[0];
      const globalCategories = preference?.categories as Record<string, boolean> | undefined;
      const projectCategories = override?.categories as Record<string, boolean> | undefined;
      const enabled = preference?.enabled !== false
        && (projectCategories?.[category] ?? globalCategories?.[category] ?? true);
      if (!enabled || devices.length === 0) return;
      await this.prisma.notificationDelivery.createMany({
        data: devices.map((device) => ({ notificationHistoryId: historyId, deviceId: device.id })),
        skipDuplicates: true,
      });
      await this.retryPendingDeliveries(historyId);
    } catch (error) {
      // A duplicate event is expected when queue jobs or webhooks are retried.
      if ((error as { code?: string }).code === "P2002") return;
      logger.warn("Mobile notification could not be persisted", { eventId: input.eventId });
      return;
    }
  }

  /** Durable retry path: the periodic worker revisits transient failures. */
  async retryPendingDeliveries(notificationHistoryId?: string): Promise<void> {
    const deliveries = await this.prisma.notificationDelivery.findMany({
      where: {
        OR: [
          { status: "PENDING", nextAttemptAt: { lte: new Date() } },
          { status: "SENDING", updatedAt: { lte: new Date(Date.now() - 5 * 60_000) } },
        ],
        ...(notificationHistoryId ? { notificationHistoryId } : {}),
        device: { registrationStatus: "ACTIVE", pushEnabled: true, invalidToken: false },
      },
      orderBy: { createdAt: "asc" },
      take: 100,
      include: { notification: true, device: true },
    });
    if (!deliveries.length) return;

    const claimed = [] as typeof deliveries;
    for (const delivery of deliveries) {
      const result = await this.prisma.notificationDelivery.updateMany({
        where: {
          id: delivery.id,
          status: delivery.status,
          ...(delivery.status === "SENDING" ? { updatedAt: delivery.updatedAt } : {}),
        },
        data: { status: "SENDING", attemptCount: { increment: 1 } },
      });
      if (result.count) claimed.push({ ...delivery, attemptCount: delivery.attemptCount + 1 });
    }
    if (!claimed.length) return;

    const eligible = [] as typeof claimed;
    for (const delivery of claimed) {
      const data = delivery.notification.data as Record<string, string>;
      const projectId = data["projectId"];
      const category = CATEGORY_BY_TYPE[delivery.notification.type];
      const preference = projectId && category
        ? await this.prisma.notificationPreference.findUnique({
            where: { userId: delivery.notification.userId },
            include: { projectOverrides: { where: { repositoryId: projectId } } },
          })
        : null;
      const override = preference?.projectOverrides[0]?.categories as Record<string, boolean> | undefined;
      const global = preference?.categories as Record<string, boolean> | undefined;
      if (preference?.enabled === false || (category && (override?.[category] ?? global?.[category]) === false)) {
        await this.prisma.notificationDelivery.update({ where: { id: delivery.id }, data: { status: "SKIPPED" } });
      } else {
        eligible.push(delivery);
      }
    }
    if (!eligible.length) return;

    const badges = new Map<string, number>();
    for (const delivery of eligible) {
      const userId = delivery.notification.userId;
      if (!badges.has(userId)) {
        badges.set(userId, await this.prisma.notificationHistory.count({ where: { userId, read: false } }));
      }
    }
    const messages: PushMessage[] = eligible.map((delivery) => {
      const storedToken = delivery.device.pushToken;
      const token = storedToken.startsWith("enc:v1:")
        ? decrypt(storedToken.slice("enc:v1:".length))
        : storedToken;
      return {
        to: token,
        title: delivery.notification.title,
        body: delivery.notification.body,
        sound: "default",
        badge: badges.get(delivery.notification.userId) ?? 0,
        data: delivery.notification.data as Record<string, string>,
      };
    });
    try {
      await this.sendBatch(eligible, messages);
    } catch {
      await this.prisma.notificationDelivery.updateMany({
        where: { id: { in: eligible.map((delivery) => delivery.id) }, status: "SENDING" },
        data: { status: "PENDING", nextAttemptAt: new Date(Date.now() + 60_000) },
      });
      logger.warn("Mobile notification delivery will be retried", { count: eligible.length });
    }
  }

  private async sendBatch(
    deliveries: Array<{ id: string; attemptCount: number; deviceId: string }>,
    messages: PushMessage[],
  ): Promise<void> {
    for (let offset = 0; offset < messages.length; offset += 100) {
      const chunk = messages.slice(offset, offset + 100);
      const deliveryChunk = deliveries.slice(offset, offset + 100);
      let response: Response | undefined;
      let transient = false;
      for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
          response = await fetch(EXPO_SEND_URL, {
            method: "POST",
            headers: { accept: "application/json", "content-type": "application/json" },
            body: JSON.stringify(chunk),
            signal: AbortSignal.timeout(10_000),
          });
          if (response.ok || (response.status < 500 && response.status !== 429)) break;
          transient = true;
        } catch {
          response = undefined;
          transient = true;
        }
        if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 250 * 2 ** attempt));
      }

      if (!response?.ok) {
        logger.warn("Expo push provider unavailable", { batchSize: chunk.length, status: response?.status });
        await Promise.all(deliveryChunk.map((delivery) => this.retryOrFail(delivery, transient)));
        continue;
      }
      const result = await response.json() as { data?: ExpoTicket[] };
      const tickets = result.data ?? [];
      for (const [index, ticket] of tickets.entries()) {
        const delivery = deliveryChunk[index];
        if (!delivery) continue;
        if (ticket.details?.error === "DeviceNotRegistered") {
          await this.prisma.mobileDevice.updateMany({
            where: { id: delivery.deviceId },
            data: { invalidToken: true, pushEnabled: false, registrationStatus: "INVALID" },
          });
          await this.prisma.notificationDelivery.update({
            where: { id: delivery.id },
            data: { status: "FAILED" },
          });
        } else if (ticket.status === "ok") {
          await this.prisma.mobileDevice.updateMany({
            where: { id: delivery.deviceId },
            data: { lastSuccessfulDelivery: new Date() },
          });
          if (ticket.id) {
            await this.prisma.pushReceipt.create({
              data: { deviceId: delivery.deviceId, ticketId: ticket.id },
            }).catch(() => undefined);
          }
          await this.prisma.notificationDelivery.update({
            where: { id: delivery.id },
            data: { status: "SENT" },
          });
        } else {
          await this.retryOrFail(delivery, true);
        }
      }
      // A missing ticket is not a confirmed delivery; retry that device.
      for (let index = (result.data ?? []).length; index < deliveryChunk.length; index += 1) {
        const delivery = deliveryChunk[index];
        if (delivery) await this.retryOrFail(delivery, true);
      }
    }
  }

  private async retryOrFail(
    delivery: { id: string; attemptCount: number },
    transient: boolean,
  ): Promise<void> {
    const exhausted = !transient || delivery.attemptCount >= 20;
    const delayMs = Math.min(30_000 * 2 ** Math.min(delivery.attemptCount, 10), 6 * 60 * 60_000);
    await this.prisma.notificationDelivery.update({
      where: { id: delivery.id },
      data: {
        status: exhausted ? "FAILED" : "PENDING",
        nextAttemptAt: new Date(Date.now() + delayMs),
      },
    });
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
