import { prisma } from "@/src/lib/prisma";

export type AuditAction =
  | "booking.cancel"
  | "booking.status_change"
  | "booking.payment_change"
  | "event.register"
  | "event.cancel_registration"
  | "event.cancel"
  | "event.status_change"
  | "court.create"
  | "court.update"
  | "court.delete"
  | "court.toggle_active"
  | "instructor.create"
  | "instructor.update"
  | "instructor.delete"
  | "instructor.toggle_active"
  | "sport.create"
  | "sport.update"
  | "sport.delete"
  | "staff.create"
  | "staff.update"
  | "staff.role_change"
  | "staff.password_reset"
  | "staff.activate"
  | "staff.deactivate"
  | "staff.trainer_link"
  | "staff.trainer_unlink"
  | "notification.daily_digest"
  | "wallet.admin_credit"
  | "wallet.admin_debit";

export type AuditEntityType = "booking" | "event" | "event_registration" | "court" | "instructor" | "sport" | "system" | "user" | "wallet";

export interface AuditEventArgs {
  actorUserId?: string;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  detail?: Record<string, unknown>;
}

/**
 * Fire-and-forget audit log. Never throws — failures are silently swallowed.
 */
export async function logAuditEvent(args: AuditEventArgs): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorUserId: args.actorUserId ?? null,
        action: args.action,
        entityType: args.entityType,
        entityId: args.entityId,
        detail: args.detail ? (args.detail as Parameters<typeof prisma.auditLog.create>[0]["data"]["detail"]) : undefined,
      },
    });
  } catch {
    // Audit log failures must never crash the main flow
  }
}
