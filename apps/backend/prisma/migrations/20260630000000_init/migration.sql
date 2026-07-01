-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'HIDDEN', 'ARCHIVE', 'NEEDS_ATTENTION', 'DELETED');
CREATE TYPE "EventAutoStatus" AS ENUM ('PLANNED', 'LIVE', 'COMPLETED');
CREATE TYPE "EventFormat" AS ENUM ('ONLINE', 'OFFLINE');
CREATE TYPE "PriceType" AS ENUM ('FREE', 'PAID');
CREATE TYPE "ImportSource" AS ENUM ('MAX', 'API', 'MANUAL');
CREATE TYPE "BotChannel" AS ENUM ('TELEGRAM', 'MAX');
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'EDITOR');
CREATE TYPE "ReminderOffset" AS ENUM ('MINUTES_5', 'MINUTES_10', 'HOUR_1', 'DAY_1', 'DAY_3', 'MORNING_OF_DAY');
CREATE TYPE "LegalDocType" AS ENUM ('PRIVACY_POLICY', 'USER_AGREEMENT', 'PERSONAL_DATA_CONSENT');

-- CreateTable User
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'EDITOR',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateTable Direction
CREATE TABLE "Direction" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Direction_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Direction_name_key" ON "Direction"("name");
CREATE UNIQUE INDEX "Direction_slug_key" ON "Direction"("slug");

-- CreateTable City
CREATE TABLE "City" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "City_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "City_name_key" ON "City"("name");

-- CreateTable Event
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "shortDescription" TEXT,
    "fullDescription" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "startTime" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'Europe/Moscow',
    "status" "EventStatus" NOT NULL DEFAULT 'DRAFT',
    "autoStatus" "EventAutoStatus" NOT NULL DEFAULT 'PLANNED',
    "isManualStatus" BOOLEAN NOT NULL DEFAULT false,
    "manualStatusById" TEXT,
    "manualStatusAt" TIMESTAMP(3),
    "format" "EventFormat" NOT NULL DEFAULT 'ONLINE',
    "cityId" TEXT,
    "cityName" TEXT,
    "address" TEXT,
    "venue" TEXT,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "eventUrl" TEXT,
    "ticketUrl" TEXT,
    "ticketSalesEnabled" BOOLEAN NOT NULL DEFAULT false,
    "speaker" TEXT,
    "priceType" "PriceType" NOT NULL DEFAULT 'FREE',
    "priceText" TEXT,
    "mainEvent" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "source" "ImportSource" NOT NULL DEFAULT 'MANUAL',
    "sourcePostUrl" TEXT,
    "sourceChannelUrl" TEXT,
    "externalId" TEXT,
    "lastSyncedAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Event_sourcePostUrl_key" ON "Event"("sourcePostUrl");
CREATE INDEX "Event_startDate_idx" ON "Event"("startDate");
CREATE INDEX "Event_status_idx" ON "Event"("status");
CREATE INDEX "Event_autoStatus_idx" ON "Event"("autoStatus");
CREATE INDEX "Event_mainEvent_idx" ON "Event"("mainEvent");
CREATE INDEX "Event_externalId_idx" ON "Event"("externalId");
CREATE INDEX "Event_sourcePostUrl_idx" ON "Event"("sourcePostUrl");

-- CreateTable EventImage
CREATE TABLE "EventImage" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "originalUrl" TEXT,
    "eventCardUrl" TEXT,
    "mainEventUrl" TEXT,
    "modalUrl" TEXT,
    "thumbnailUrl" TEXT,
    "cropX" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cropY" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cropScale" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "EventImage_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "EventImage_eventId_key" ON "EventImage"("eventId");

-- CreateTable EventDirection
CREATE TABLE "EventDirection" (
    "eventId" TEXT NOT NULL,
    "directionId" TEXT NOT NULL,
    CONSTRAINT "EventDirection_pkey" PRIMARY KEY ("eventId", "directionId")
);

-- CreateTable EventTag
CREATE TABLE "EventTag" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    CONSTRAINT "EventTag_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "EventTag_eventId_idx" ON "EventTag"("eventId");

-- CreateTable EventVersion
CREATE TABLE "EventVersion" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    CONSTRAINT "EventVersion_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "EventVersion_eventId_idx" ON "EventVersion"("eventId");

-- CreateTable Quote
CREATE TABLE "Quote" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "author" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Quote_pkey" PRIMARY KEY ("id")
);

-- CreateTable FooterProject
CREATE TABLE "FooterProject" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FooterProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable BotUser
CREATE TABLE "BotUser" (
    "id" TEXT NOT NULL,
    "channel" "BotChannel" NOT NULL,
    "externalId" TEXT NOT NULL,
    "username" TEXT,
    "firstName" TEXT,
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "subscribedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BotUser_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "BotUser_channel_externalId_key" ON "BotUser"("channel", "externalId");

-- CreateTable Reminder
CREATE TABLE "Reminder" (
    "id" TEXT NOT NULL,
    "botUserId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "offset" "ReminderOffset" NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "failReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Reminder_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Reminder_scheduledAt_idx" ON "Reminder"("scheduledAt");
CREATE INDEX "Reminder_eventId_idx" ON "Reminder"("eventId");

-- CreateTable MaxImportLog
CREATE TABLE "MaxImportLog" (
    "id" TEXT NOT NULL,
    "runAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "postsFound" INTEGER NOT NULL DEFAULT 0,
    "imported" INTEGER NOT NULL DEFAULT 0,
    "updated" INTEGER NOT NULL DEFAULT 0,
    "skipped" INTEGER NOT NULL DEFAULT 0,
    "errors" INTEGER NOT NULL DEFAULT 0,
    "errorDetail" JSONB,
    CONSTRAINT "MaxImportLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable HashtagMapping
CREATE TABLE "HashtagMapping" (
    "id" TEXT NOT NULL,
    "hashtag" TEXT NOT NULL,
    "directionId" TEXT,
    "isMainEvent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "HashtagMapping_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "HashtagMapping_hashtag_key" ON "HashtagMapping"("hashtag");

-- CreateTable ApiSource
CREATE TABLE "ApiSource" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "method" TEXT NOT NULL DEFAULT 'GET',
    "headers" JSONB NOT NULL DEFAULT '{}',
    "authType" TEXT NOT NULL DEFAULT 'none',
    "authConfig" JSONB NOT NULL DEFAULT '{}',
    "syncPeriod" INTEGER NOT NULL DEFAULT 60,
    "fieldMapping" JSONB NOT NULL DEFAULT '{}',
    "syncMode" TEXT NOT NULL DEFAULT 'new_and_update',
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "lastSyncAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ApiSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable ApiSourceLog
CREATE TABLE "ApiSourceLog" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "runAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "success" BOOLEAN NOT NULL,
    "imported" INTEGER NOT NULL DEFAULT 0,
    "errors" INTEGER NOT NULL DEFAULT 0,
    "errorDetail" TEXT,
    CONSTRAINT "ApiSourceLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable EventView
CREATE TABLE "EventView" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "sessionId" TEXT,
    "action" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EventView_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "EventView_eventId_idx" ON "EventView"("eventId");
CREATE INDEX "EventView_createdAt_idx" ON "EventView"("createdAt");

-- CreateTable SiteVisit
CREATE TABLE "SiteVisit" (
    "id" TEXT NOT NULL,
    "page" TEXT NOT NULL,
    "sessionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SiteVisit_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "SiteVisit_createdAt_idx" ON "SiteVisit"("createdAt");

-- CreateTable SiteConfig
CREATE TABLE "SiteConfig" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SiteConfig_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "SiteConfig_key_key" ON "SiteConfig"("key");

-- CreateTable SiteConfigVersion
CREATE TABLE "SiteConfigVersion" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    CONSTRAINT "SiteConfigVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable LegalDoc
CREATE TABLE "LegalDoc" (
    "id" TEXT NOT NULL,
    "type" "LegalDocType" NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isDraft" BOOLEAN NOT NULL DEFAULT true,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LegalDoc_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "LegalDoc_type_key" ON "LegalDoc"("type");

-- CreateTable LegalDocVersion
CREATE TABLE "LegalDocVersion" (
    "id" TEXT NOT NULL,
    "docId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    CONSTRAINT "LegalDocVersion_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "LegalDocVersion_docId_idx" ON "LegalDocVersion"("docId");

-- CreateTable AdminNotification
CREATE TABLE "AdminNotification" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "payload" JSONB,
    "sentAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "failReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AdminNotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable ActionLog
CREATE TABLE "ActionLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT,
    "entityId" TEXT,
    "before" JSONB,
    "after" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ActionLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ActionLog_userId_idx" ON "ActionLog"("userId");
CREATE INDEX "ActionLog_createdAt_idx" ON "ActionLog"("createdAt");

-- CreateTable ErrorLog
CREATE TABLE "ErrorLog" (
    "id" TEXT NOT NULL,
    "context" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "stack" TEXT,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ErrorLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ErrorLog_createdAt_idx" ON "ErrorLog"("createdAt");

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Event" ADD CONSTRAINT "Event_manualStatusById_fkey" FOREIGN KEY ("manualStatusById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EventImage" ADD CONSTRAINT "EventImage_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EventDirection" ADD CONSTRAINT "EventDirection_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EventDirection" ADD CONSTRAINT "EventDirection_directionId_fkey" FOREIGN KEY ("directionId") REFERENCES "Direction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EventTag" ADD CONSTRAINT "EventTag_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EventVersion" ADD CONSTRAINT "EventVersion_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Reminder" ADD CONSTRAINT "Reminder_botUserId_fkey" FOREIGN KEY ("botUserId") REFERENCES "BotUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Reminder" ADD CONSTRAINT "Reminder_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "HashtagMapping" ADD CONSTRAINT "HashtagMapping_directionId_fkey" FOREIGN KEY ("directionId") REFERENCES "Direction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ApiSourceLog" ADD CONSTRAINT "ApiSourceLog_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "ApiSource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EventView" ADD CONSTRAINT "EventView_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LegalDocVersion" ADD CONSTRAINT "LegalDocVersion_docId_fkey" FOREIGN KEY ("docId") REFERENCES "LegalDoc"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ActionLog" ADD CONSTRAINT "ActionLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
