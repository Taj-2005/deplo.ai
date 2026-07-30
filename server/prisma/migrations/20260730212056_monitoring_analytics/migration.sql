-- CreateTable
CREATE TABLE "UptimeSample" (
    "id" TEXT NOT NULL,
    "repositoryId" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "ok" BOOLEAN NOT NULL,
    "httpStatus" INTEGER,
    "latencyMs" INTEGER,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UptimeSample_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalyticsEvent" (
    "id" TEXT NOT NULL,
    "repositoryId" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "referrer" TEXT,
    "visitorHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalyticsEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UptimeSample_repositoryId_checkedAt_idx" ON "UptimeSample"("repositoryId", "checkedAt");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_repositoryId_createdAt_idx" ON "AnalyticsEvent"("repositoryId", "createdAt");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_repositoryId_visitorHash_createdAt_idx" ON "AnalyticsEvent"("repositoryId", "visitorHash", "createdAt");

-- AddForeignKey
ALTER TABLE "UptimeSample" ADD CONSTRAINT "UptimeSample_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalyticsEvent" ADD CONSTRAINT "AnalyticsEvent_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id") ON DELETE CASCADE ON UPDATE CASCADE;

