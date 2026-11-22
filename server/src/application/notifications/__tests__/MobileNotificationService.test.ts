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
    notificationHistory: { count: jest.fn().mockResolvedValue(2) },
    ...overrides,
  };
  return { prisma: prisma as unknown as PrismaClient, tx, raw: prisma };
}

describe("MobileNotificationService", () => {
  afterEach(() => jest.restoreAllMocks());

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
    expect(JSON.stringify(payload)).not.toContain("secret-token");
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
});
