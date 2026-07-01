-- Migration: replace fixed ReminderOffset enum with free remindAt DateTime
-- No production data to preserve; old table is dropped and recreated.

-- Drop old Reminder table (removes foreign key constraints and indexes)
DROP TABLE IF EXISTS "Reminder";

-- Drop old ReminderOffset enum
DROP TYPE IF EXISTS "ReminderOffset";

-- Create new ReminderStatus enum (idempotent)
DO $$ BEGIN
  CREATE TYPE "ReminderStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable Reminder (new schema)
CREATE TABLE "Reminder" (
    "id"         TEXT NOT NULL,
    "botUserId"  TEXT NOT NULL,
    "eventId"    TEXT NOT NULL,
    "remindAt"   TIMESTAMP(3) NOT NULL,
    "timezone"   TEXT NOT NULL DEFAULT 'Europe/Moscow',
    "status"     "ReminderStatus" NOT NULL DEFAULT 'PENDING',
    "sentAt"     TIMESTAMP(3),
    "failedAt"   TIMESTAMP(3),
    "failReason" TEXT,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Reminder_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Reminder_remindAt_idx" ON "Reminder"("remindAt");
CREATE INDEX "Reminder_eventId_idx"  ON "Reminder"("eventId");
CREATE INDEX "Reminder_status_idx"   ON "Reminder"("status");

-- BotUser: RESTRICT — нельзя удалить пользователя пока есть напоминания
ALTER TABLE "Reminder" ADD CONSTRAINT "Reminder_botUserId_fkey"
    FOREIGN KEY ("botUserId") REFERENCES "BotUser"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- Event: CASCADE — при удалении события напоминания удаляются автоматически
ALTER TABLE "Reminder" ADD CONSTRAINT "Reminder_eventId_fkey"
    FOREIGN KEY ("eventId") REFERENCES "Event"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
