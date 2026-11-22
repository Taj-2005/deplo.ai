CREATE TABLE "MobileDevice" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "deviceName" TEXT NOT NULL,
    "pushToken" TEXT NOT NULL,
    "pushEnabled" BOOLEAN NOT NULL DEFAULT true,
    "registrationStatus" TEXT NOT NULL DEFAULT 'ACTIVE',
    "invalidToken" BOOLEAN NOT NULL DEFAULT false,
    "lastSuccessfulDelivery" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MobileDevice_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "MobileDevice_userId_deviceId_key" ON "MobileDevice"("userId", "deviceId");
CREATE INDEX "MobileDevice_userId_registrationStatus_idx" ON "MobileDevice"("userId", "registrationStatus");
ALTER TABLE "MobileDevice" ADD CONSTRAINT "MobileDevice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "NotificationPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "categories" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "NotificationPreference_userId_key" ON "NotificationPreference"("userId");
ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ProjectNotificationOverride" (
    "id" TEXT NOT NULL,
    "preferenceId" TEXT NOT NULL,
    "repositoryId" TEXT NOT NULL,
    "categories" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ProjectNotificationOverride_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ProjectNotificationOverride_preferenceId_repositoryId_key" ON "ProjectNotificationOverride"("preferenceId", "repositoryId");
CREATE INDEX "ProjectNotificationOverride_repositoryId_idx" ON "ProjectNotificationOverride"("repositoryId");
ALTER TABLE "ProjectNotificationOverride" ADD CONSTRAINT "ProjectNotificationOverride_preferenceId_fkey" FOREIGN KEY ("preferenceId") REFERENCES "NotificationPreference"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectNotificationOverride" ADD CONSTRAINT "ProjectNotificationOverride_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "NotificationHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "data" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NotificationHistory_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "NotificationHistory_userId_createdAt_idx" ON "NotificationHistory"("userId", "createdAt");
ALTER TABLE "NotificationHistory" ADD CONSTRAINT "NotificationHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "NotificationEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NotificationEvent_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "NotificationEvent_userId_eventId_key" ON "NotificationEvent"("userId", "eventId");
CREATE INDEX "NotificationEvent_userId_createdAt_idx" ON "NotificationEvent"("userId", "createdAt");
ALTER TABLE "NotificationEvent" ADD CONSTRAINT "NotificationEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "PushReceipt" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "checkedAt" TIMESTAMP(3),
    CONSTRAINT "PushReceipt_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PushReceipt_ticketId_key" ON "PushReceipt"("ticketId");
CREATE INDEX "PushReceipt_checkedAt_createdAt_idx" ON "PushReceipt"("checkedAt", "createdAt");
ALTER TABLE "PushReceipt" ADD CONSTRAINT "PushReceipt_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "MobileDevice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "NotificationDelivery" (
    "id" TEXT NOT NULL,
    "notificationHistoryId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "NotificationDelivery_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "NotificationDelivery_notificationHistoryId_deviceId_key" ON "NotificationDelivery"("notificationHistoryId", "deviceId");
CREATE INDEX "NotificationDelivery_status_nextAttemptAt_idx" ON "NotificationDelivery"("status", "nextAttemptAt");
ALTER TABLE "NotificationDelivery" ADD CONSTRAINT "NotificationDelivery_notificationHistoryId_fkey" FOREIGN KEY ("notificationHistoryId") REFERENCES "NotificationHistory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NotificationDelivery" ADD CONSTRAINT "NotificationDelivery_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "MobileDevice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
