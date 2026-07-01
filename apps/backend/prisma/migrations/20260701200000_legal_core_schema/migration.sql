-- Migration: Legal core schema — extend LegalDocType, extend BotUser, add Broadcast foundation

-- Extend LegalDocType enum
ALTER TYPE "LegalDocType" ADD VALUE IF NOT EXISTS 'COOKIE_POLICY';
ALTER TYPE "LegalDocType" ADD VALUE IF NOT EXISTS 'BROADCAST_CONSENT';

-- Extend BotUser with phone, consent and marketing flags
ALTER TABLE "BotUser"
  ADD COLUMN IF NOT EXISTS "phone"                        TEXT,
  ADD COLUMN IF NOT EXISTS "phoneVerifiedAt"              TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "allowMarketingMessages"       BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "allowServiceNotifications"    BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "legalAcceptedAt"              TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "broadcastConsentAcceptedAt"   TIMESTAMP(3);

-- Add publishedAt to LegalDocVersion (each version stores its publication date)
ALTER TABLE "LegalDocVersion"
  ADD COLUMN IF NOT EXISTS "publishedAt" TIMESTAMP(3);

-- New enums for broadcasts
DO $$ BEGIN
  CREATE TYPE "BroadcastStatus" AS ENUM (
    'DRAFT', 'SCHEDULED', 'QUEUED', 'SENDING', 'PAUSED', 'SENT', 'FAILED', 'CANCELLED'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "BroadcastChannel" AS ENUM ('TELEGRAM', 'MAX', 'ALL');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "BroadcastRecipientStatus" AS ENUM (
    'PENDING', 'SENT', 'DELIVERED', 'FAILED', 'SKIPPED'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Broadcast (foundation — no queue logic yet)
CREATE TABLE IF NOT EXISTS "Broadcast" (
    "id"             TEXT             NOT NULL,
    "title"          TEXT             NOT NULL,
    "messageText"    TEXT             NOT NULL,
    "imageUrl"       TEXT,
    "buttonText"     TEXT,
    "buttonUrl"      TEXT,
    "channel"        "BroadcastChannel"   NOT NULL DEFAULT 'ALL',
    "audienceFilter" JSONB            NOT NULL DEFAULT '{}',
    "status"         "BroadcastStatus"    NOT NULL DEFAULT 'DRAFT',
    "scheduledAt"    TIMESTAMP(3),
    "testSentAt"     TIMESTAMP(3),
    "startedAt"      TIMESTAMP(3),
    "completedAt"    TIMESTAMP(3),
    "createdAt"      TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Broadcast_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Broadcast_status_idx"      ON "Broadcast"("status");
CREATE INDEX IF NOT EXISTS "Broadcast_scheduledAt_idx" ON "Broadcast"("scheduledAt");

-- Broadcast recipients log
CREATE TABLE IF NOT EXISTS "BroadcastRecipient" (
    "id"            TEXT                       NOT NULL,
    "broadcastId"   TEXT                       NOT NULL,
    "botUserId"     TEXT                       NOT NULL,
    "channel"       "BotChannel"               NOT NULL,
    "status"        "BroadcastRecipientStatus" NOT NULL DEFAULT 'PENDING',
    "sentAt"        TIMESTAMP(3),
    "failedAt"      TIMESTAMP(3),
    "failReason"    TEXT,
    "skippedReason" TEXT,
    "createdAt"     TIMESTAMP(3)               NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BroadcastRecipient_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "BroadcastRecipient_broadcastId_idx" ON "BroadcastRecipient"("broadcastId");
CREATE INDEX IF NOT EXISTS "BroadcastRecipient_botUserId_idx"   ON "BroadcastRecipient"("botUserId");

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'BroadcastRecipient_broadcastId_fkey'
  ) THEN
    ALTER TABLE "BroadcastRecipient"
      ADD CONSTRAINT "BroadcastRecipient_broadcastId_fkey"
        FOREIGN KEY ("broadcastId") REFERENCES "Broadcast"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'BroadcastRecipient_botUserId_fkey'
  ) THEN
    ALTER TABLE "BroadcastRecipient"
      ADD CONSTRAINT "BroadcastRecipient_botUserId_fkey"
        FOREIGN KEY ("botUserId") REFERENCES "BotUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Broadcast operational log
CREATE TABLE IF NOT EXISTS "BroadcastLog" (
    "id"          TEXT         NOT NULL,
    "broadcastId" TEXT         NOT NULL,
    "level"       TEXT         NOT NULL DEFAULT 'info',
    "message"     TEXT         NOT NULL,
    "payload"     JSONB,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BroadcastLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "BroadcastLog_broadcastId_idx" ON "BroadcastLog"("broadcastId");
CREATE INDEX IF NOT EXISTS "BroadcastLog_createdAt_idx"   ON "BroadcastLog"("createdAt");

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'BroadcastLog_broadcastId_fkey'
  ) THEN
    ALTER TABLE "BroadcastLog"
      ADD CONSTRAINT "BroadcastLog_broadcastId_fkey"
        FOREIGN KEY ("broadcastId") REFERENCES "Broadcast"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
