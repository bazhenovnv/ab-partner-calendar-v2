-- Editorial publisher: channel posts, per-channel delivery status and native view snapshots.
CREATE TABLE "EditorialPost" (
    "id" TEXT NOT NULL,
    "contentType" TEXT NOT NULL DEFAULT 'NEWS',
    "title" TEXT NOT NULL,
    "contentHtml" TEXT NOT NULL,
    "contentText" TEXT NOT NULL,
    "media" JSONB NOT NULL DEFAULT '[]',
    "channelKeys" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "scheduledAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "EditorialPost_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EditorialPublication" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "channelKey" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "channelName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "providerMessageId" TEXT,
    "providerUrl" TEXT,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "views" INTEGER,
    "reposts" INTEGER,
    "publishedAt" TIMESTAMP(3),
    "lastStatsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "EditorialPublication_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EditorialStatsSnapshot" (
    "id" TEXT NOT NULL,
    "publicationId" TEXT NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,
    "reposts" INTEGER,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EditorialStatsSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "EditorialPost_status_idx" ON "EditorialPost"("status");
CREATE INDEX "EditorialPost_contentType_idx" ON "EditorialPost"("contentType");
CREATE INDEX "EditorialPost_createdAt_idx" ON "EditorialPost"("createdAt");
CREATE INDEX "EditorialPublication_channelKey_idx" ON "EditorialPublication"("channelKey");
CREATE INDEX "EditorialPublication_status_idx" ON "EditorialPublication"("status");
CREATE INDEX "EditorialPublication_publishedAt_idx" ON "EditorialPublication"("publishedAt");
CREATE UNIQUE INDEX "EditorialPublication_postId_channelKey_key" ON "EditorialPublication"("postId", "channelKey");
CREATE INDEX "EditorialStatsSnapshot_publicationId_idx" ON "EditorialStatsSnapshot"("publicationId");
CREATE INDEX "EditorialStatsSnapshot_capturedAt_idx" ON "EditorialStatsSnapshot"("capturedAt");

ALTER TABLE "EditorialPublication"
ADD CONSTRAINT "EditorialPublication_postId_fkey"
FOREIGN KEY ("postId") REFERENCES "EditorialPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EditorialStatsSnapshot"
ADD CONSTRAINT "EditorialStatsSnapshot_publicationId_fkey"
FOREIGN KEY ("publicationId") REFERENCES "EditorialPublication"("id") ON DELETE CASCADE ON UPDATE CASCADE;
