-- Migration: Add cancelledBy/cancelledAt/cancellationReason to Booking + AuditLog table

-- Phase 2.1: Cancellation tracking on Booking
ALTER TABLE "Booking"
  ADD COLUMN IF NOT EXISTS "cancelledBy"          TEXT,
  ADD COLUMN IF NOT EXISTS "cancelledAt"          TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "cancellationReason"   TEXT;

-- Phase 2.2: Audit log
CREATE TABLE IF NOT EXISTS "AuditLog" (
  "id"          TEXT NOT NULL,
  "actorUserId" TEXT,
  "action"      TEXT NOT NULL,
  "entityType"  TEXT NOT NULL,
  "entityId"    TEXT NOT NULL,
  "detail"      JSONB,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AuditLog_entityType_entityId_createdAt_idx"
  ON "AuditLog"("entityType", "entityId", "createdAt");

CREATE INDEX IF NOT EXISTS "AuditLog_actorUserId_createdAt_idx"
  ON "AuditLog"("actorUserId", "createdAt");

CREATE INDEX IF NOT EXISTS "AuditLog_action_createdAt_idx"
  ON "AuditLog"("action", "createdAt");
