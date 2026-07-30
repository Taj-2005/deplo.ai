-- CreateTable
CREATE TABLE "CliToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CliToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CliToken_tokenHash_key" ON "CliToken"("tokenHash");

-- CreateIndex
CREATE INDEX "CliToken_userId_idx" ON "CliToken"("userId");

-- AddForeignKey
ALTER TABLE "CliToken" ADD CONSTRAINT "CliToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

