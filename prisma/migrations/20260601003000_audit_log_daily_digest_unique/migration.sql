CREATE UNIQUE INDEX "AuditLog_daily_digest_unique"
  ON "AuditLog" ("entityId")
  WHERE "action" = 'notification.daily_digest';
