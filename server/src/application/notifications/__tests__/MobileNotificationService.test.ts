import { MobileNotificationService } from "../MobileNotificationService";
import type { PrismaClient } from "@prisma/client";

function makePrisma(overrides: Record<string, unknown> = {}) {
  const tx = {
    notificationEvent: { create: jest.fn().mockResolvedValue({}) },
    notificationHistory: { create: jest.fn().mockResolvedValue({ id: "history_1" }) },
  };
  const prisma = {
    $transaction: jest.fn(async (fn: (client: typeof tx) => Promise<unknown>) => fn(tx)),
    notificationPreference: { findUnique: jest.fn().mockResolvedValue(null) },
    mobileDevice: {
      findMany: jest.fn().mockResolvedValue([{ id: "device_1", pushToken: "ExponentPushToken[secret-token]" }]),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    notificationDelivery: {
      createMany: jest.fn().mockResolvedValue({ count: 1 }),
      findMany: jest.fn().mockResolvedValue([{
        id: "delivery_1",
        attemptCount: 0,
        deviceId: "device_1",
        notification: {
          userId: "user_1",
          type: "deployment-failed",
          title: "shop deployment failed",
          body: "Review logs in Deplo.",
          data: { route: "deployment", projectId: "repo_1", deploymentId: "dep_1" },
        },
        device: { pushToken: "ExponentPushToken[secret-token]" },
      }]),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      update: jest.fn().mockResolvedValue({}),
    },
    pushReceipt: {
      create: jest.fn().mockResolvedValue({}),
      findMany: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockResolvedValue({}),
    },
    notificationHistory: { count: jest.fn().mockResolvedValue(2) },
    ...overrides,
  };
  return { prisma: prisma as unknown as PrismaClient, tx, raw: prisma };
}

describe("MobileNotificationService", () => {
  afterEach(() => jest.restoreAllMocks());

  it("ignores notification types without a preference category", async () => {
    const { prisma, raw } = makePrisma();
    const fetchMock = jest.spyOn(global, "fetch");

    await new MobileNotificationService(prisma).notify({
      userId: "user_1",
      eventId: "dep_0:unknown",
      type: "unknown-event",
      title: "ignored",
      body: "ignored",
      projectId: "repo_1",
    });

    expect(raw.$transaction).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends only route identifiers and cleans up invalid tokens", async () => {
    const { prisma, raw } = makePrisma();
    const fetchMock = jest.spyOn(global, "fetch").mockResolvedValue(new Response(JSON.stringify({
      data: [{ status: "error", details: { error: "DeviceNotRegistered" } }],
    }), { status: 200 }));
    const service = new MobileNotificationService(prisma);

    await service.notify({
      userId: "user_1",
      eventId: "dep_1:failed",
      type: "deployment-failed",
      title: "shop deployment failed",
      body: "Review logs in Deplo.",
      projectId: "repo_1",
      deploymentId: "dep_1",
    });

    const payload = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)) as Array<Record<string, unknown>>;
    expect(payload[0]).toMatchObject({
      title: "shop deployment failed",
      badge: 2,
      data: { route: "deployment", projectId: "repo_1", deploymentId: "dep_1" },
    });
    expect(JSON.stringify(payload[0]?.data)).not.toContain("secret-token");
    expect(raw.mobileDevice.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "device_1" },
      data: { invalidToken: true, pushEnabled: false, registrationStatus: "INVALID" },
    }));
  });

  it("does not dispatch a duplicate event", async () => {
    const { prisma } = makePrisma({
      $transaction: jest.fn().mockRejectedValue({ code: "P2002" }),
    });
    const fetchMock = jest.spyOn(global, "fetch");
    await new MobileNotificationService(prisma).notify({
      userId: "user_1",
      eventId: "dep_1:failed",
      type: "deployment-failed",
      title: "shop deployment failed",
      body: "Review logs in Deplo.",
      projectId: "repo_1",
      deploymentId: "dep_1",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("honors a per-project category override over the global preference", async () => {
    const { prisma, raw } = makePrisma({
      notificationPreference: {
        findUnique: jest.fn().mockResolvedValue({
          enabled: true,
          categories: { "deployment-failed": false },
          projectOverrides: [{ categories: { "deployment-failed": true } }],
        }),
      },
      notificationDelivery: {
        createMany: jest.fn().mockResolvedValue({ count: 1 }),
        findMany: jest.fn().mockResolvedValue([]),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        update: jest.fn().mockResolvedValue({}),
      },
    });
    const fetchMock = jest.spyOn(global, "fetch");

    await new MobileNotificationService(prisma).notify({
      userId: "user_1",
      eventId: "dep_2:failed",
      type: "deployment-failed",
      title: "shop deployment failed",
      body: "Review logs in Deplo.",
      projectId: "repo_1",
      deploymentId: "dep_2",
    });

    expect(raw.notificationDelivery.createMany).toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not register deliveries when the category is disabled", async () => {
    const { prisma, raw } = makePrisma({
      notificationPreference: {
        findUnique: jest.fn().mockResolvedValue({
          enabled: true,
          categories: { "deployment-failed": false },
          projectOverrides: [],
        }),
      },
    });

    await new MobileNotificationService(prisma).notify({
      userId: "user_1",
      eventId: "dep_3:failed",
      type: "deployment-failed",
      title: "shop deployment failed",
      body: "Review logs in Deplo.",
      projectId: "repo_1",
      deploymentId: "dep_3",
    });

    expect(raw.notificationDelivery.createMany).not.toHaveBeenCalled();
  });

  it("does not enqueue a push when no active devices are registered", async () => {
    const { prisma, raw } = makePrisma({
      mobileDevice: {
        findMany: jest.fn().mockResolvedValue([]),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    });

    await new MobileNotificationService(prisma).notify({
      userId: "user_1",
      eventId: "dep_5:failed",
      type: "deployment-failed",
      title: "shop deployment failed",
      body: "Review logs in Deplo.",
      projectId: "repo_1",
      deploymentId: "dep_5",
    });

    expect(raw.notificationDelivery.createMany).not.toHaveBeenCalled();
  });

  it("retries a transient provider outage and persists a backoff", async () => {
    const { prisma, raw } = makePrisma();
    jest.spyOn(global, "fetch").mockResolvedValue(new Response("{}", { status: 503 }));

    await new MobileNotificationService(prisma).notify({
      userId: "user_1",
      eventId: "dep_4:failed",
      type: "deployment-failed",
      title: "shop deployment failed",
      body: "Review logs in Deplo.",
      projectId: "repo_1",
      deploymentId: "dep_4",
    });

    expect(raw.notificationDelivery.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "delivery_1" },
      data: expect.objectContaining({ status: "PENDING", nextAttemptAt: expect.any(Date) }),
    }));
  });

  it("cleans up tokens rejected in Expo push receipts", async () => {
    const { prisma, raw } = makePrisma({
      pushReceipt: {
        create: jest.fn().mockResolvedValue({}),
        findMany: jest.fn().mockResolvedValue([{ id: "receipt_1", deviceId: "device_1", ticketId: "ticket_1" }]),
        update: jest.fn().mockResolvedValue({}),
      },
    });
    jest.spyOn(global, "fetch").mockResolvedValue(new Response(JSON.stringify({
      data: { ticket_1: { status: "error", details: { error: "DeviceNotRegistered" } } },
    }), { status: 200 }));

    await new MobileNotificationService(prisma).checkReceipts();

    expect(raw.mobileDevice.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "device_1" },
      data: { invalidToken: true, pushEnabled: false, registrationStatus: "INVALID" },
    }));
    expect(raw.pushReceipt.update).toHaveBeenCalledWith({
      where: { id: "receipt_1" },
      data: { checkedAt: expect.any(Date) },
    });
  });

  it("does not request Expo receipts when there are none due", async () => {
    const { prisma } = makePrisma();
    const fetchMock = jest.spyOn(global, "fetch");

    await new MobileNotificationService(prisma).checkReceipts();

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
