import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { assertSuperAdmin } from "@/src/lib/auth/guards";
import { userNeedsPasswordSetup } from "@/src/lib/auth/account-setup";
import { prisma } from "@/src/lib/prisma";
import {
  changeStaffRoleSchema,
  createStaffSchema,
  relinkTrainerInstructorSchema,
  setStaffActiveSchema,
  updateStaffSchema,
  type CreateStaffInput,
  type StaffRole,
  type UpdateStaffInput,
} from "@/src/lib/admin/staff-schema";

export interface StaffListFilters {
  q?: string;
  role?: StaffRole | "all";
  active?: "all" | "active" | "disabled";
}

export interface StaffMemberRow {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: StaffRole;
  active: boolean;
  instructorId: string | null;
  instructorName: string | null;
  createdAtIso: string;
  passwordHash: string;
  needsPasswordSetup: boolean;
}

export interface StaffOption {
  id: string;
  name: string;
}

export interface StaffPageData {
  staff: StaffMemberRow[];
  unlinkedInstructors: StaffOption[];
  allInstructors: StaffOption[];
  sports: StaffOption[];
  locations: StaffOption[];
}

export class StaffActionError extends Error {
  constructor(
    message: string,
    public readonly code = "staff_action_failed",
  ) {
    super(message);
  }
}

function mapRole(role: string): StaffRole {
  if (role === "admin" || role === "super_admin" || role === "trainer") {
    return role;
  }
  throw new StaffActionError("Некорректная роль сотрудника.");
}

function normalizeError(error: unknown): never {
  if (error instanceof StaffActionError) {
    throw error;
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    throw new StaffActionError("Этот email уже используется другим аккаунтом.", "staff_email_taken");
  }
  throw new StaffActionError("Не удалось выполнить действие.", "staff_action_failed");
}

function getStaffAuditAction(action: "activate" | "deactivate") {
  return action === "activate" ? "staff.activate" : "staff.deactivate";
}

async function ensureEmailAvailable(email: string, exceptUserId?: string) {
  const owner = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (owner && owner.id !== exceptUserId) {
    throw new StaffActionError("Этот email уже используется другим аккаунтом.", "staff_email_taken");
  }
}

async function ensureLastActiveSuperAdminSafe(userId: string) {
  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, active: true },
  });

  if (target?.role !== "super_admin" || !target.active) {
    return;
  }

  const activeSuperAdmins = await prisma.user.count({
    where: {
      role: "super_admin",
      active: true,
      id: { not: userId },
    },
  });

  if (activeSuperAdmins === 0) {
    throw new StaffActionError("Нельзя отключить последнего активного супер-администратора.", "last_super_admin");
  }
}

async function assertInstructorCanBeLinked(instructorId: string, currentUserId?: string) {
  const instructor = await prisma.instructor.findUnique({
    where: { id: instructorId },
    select: {
      id: true,
      trainerUser: {
        select: { id: true },
      },
    },
  });

  if (!instructor) {
    throw new StaffActionError("Карточка тренера не найдена.", "instructor_not_found");
  }

  if (instructor.trainerUser && instructor.trainerUser.id !== currentUserId) {
    throw new StaffActionError("Эта карточка тренера уже связана с другим аккаунтом.", "instructor_taken");
  }
}

export async function getStaffPageData(filters: StaffListFilters = {}): Promise<StaffPageData> {
  await assertSuperAdmin();

  const where: Prisma.UserWhereInput = {
    role: { in: ["admin", "super_admin", "trainer"] },
  };

  if (filters.role && filters.role !== "all") {
    where.role = filters.role;
  }

  if (filters.active === "active") {
    where.active = true;
  } else if (filters.active === "disabled") {
    where.active = false;
  }

  const q = filters.q?.trim();
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
      { phone: { contains: q, mode: "insensitive" } },
    ];
  }

  const [staff, unlinkedInstructors, allInstructors, sports, locations] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: [{ active: "desc" }, { createdAt: "desc" }],
      include: {
        instructor: {
          select: { id: true, name: true },
        },
      },
    }),
    prisma.instructor.findMany({
      where: { trainerUser: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.instructor.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.sport.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true },
    }),
    prisma.location.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true },
    }),
  ]);

  return {
    staff: staff.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: mapRole(user.role),
      active: user.active,
      instructorId: user.instructor?.id ?? null,
      instructorName: user.instructor?.name ?? null,
      createdAtIso: user.createdAt.toISOString(),
      passwordHash: user.passwordHash,
      needsPasswordSetup: userNeedsPasswordSetup(user.passwordHash),
    })),
    unlinkedInstructors,
    allInstructors,
    sports,
    locations,
  };
}

export async function createStaffMember(input: CreateStaffInput): Promise<{ id: string }> {
  const actor = await assertSuperAdmin();
  const parsed = createStaffSchema.parse(input);
  await ensureEmailAvailable(parsed.email);

  try {
    const passwordHash =
      parsed.passwordMode === "manual"
        ? await bcrypt.hash(parsed.password ?? "", 10)
        : `staff-created-${randomUUID()}`;

    return await prisma.$transaction(async (tx) => {
      let instructorId: string | null = null;

      if (parsed.role === "trainer") {
        if (parsed.instructorMode === "link_existing") {
          await assertInstructorCanBeLinked(parsed.instructorId ?? "");
          instructorId = parsed.instructorId ?? null;
        } else if (parsed.instructorMode === "create_new" && parsed.newInstructor) {
          const instructor = await tx.instructor.create({
            data: {
              name: parsed.newInstructor.name?.trim() || parsed.name,
              bio: parsed.newInstructor.bio?.trim() || null,
              active: true,
              instructorSports: {
                create: parsed.newInstructor.sportPrices.map((row) => ({
                  sportId: row.sportId,
                  pricePerHour: row.pricePerHour,
                })),
              },
              instructorLocations: {
                create: parsed.newInstructor.locationIds.map((locationId) => ({
                  locationId,
                  active: true,
                })),
              },
            },
            select: { id: true },
          });
          instructorId = instructor.id;
        }
      }

      const user = await tx.user.create({
        data: {
          name: parsed.name,
          email: parsed.email,
          phone: parsed.phone,
          role: parsed.role,
          active: true,
          instructorId,
          passwordHash,
          emailVerifiedAt: new Date(),
          phoneVerifiedAt: new Date(),
        },
        select: { id: true },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: actor.user.id,
          action: "staff.create",
          entityType: "user",
          entityId: user.id,
          detail: {
            role: parsed.role,
            instructorId,
            passwordMode: parsed.passwordMode,
          },
        },
      });

      return user;
    });
  } catch (error) {
    normalizeError(error);
  }
}

export async function updateStaffMember(input: UpdateStaffInput): Promise<void> {
  const actor = await assertSuperAdmin();
  const parsed = updateStaffSchema.parse(input);
  await ensureEmailAvailable(parsed.email, parsed.userId);

  const current = await prisma.user.findFirst({
    where: { id: parsed.userId, role: { in: ["admin", "super_admin", "trainer"] } },
    select: { id: true, name: true, email: true, phone: true },
  });
  if (!current) {
    throw new StaffActionError("Сотрудник не найден.", "staff_not_found");
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: parsed.userId },
        data: {
          name: parsed.name,
          email: parsed.email,
          phone: parsed.phone,
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: actor.user.id,
          action: "staff.update",
          entityType: "user",
          entityId: parsed.userId,
          detail: {
            old: current,
            new: {
              name: parsed.name,
              email: parsed.email,
              phone: parsed.phone,
            },
          },
        },
      });
    });
  } catch (error) {
    normalizeError(error);
  }
}

export async function resetStaffPassword(userId: string): Promise<void> {
  const actor = await assertSuperAdmin();
  const target = await prisma.user.findFirst({
    where: { id: userId, role: { in: ["admin", "super_admin", "trainer"] } },
    select: { id: true },
  });
  if (!target) {
    throw new StaffActionError("Сотрудник не найден.", "staff_not_found");
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { passwordHash: `staff-reset-${randomUUID()}` },
    });
    await tx.auditLog.create({
      data: {
        actorUserId: actor.user.id,
        action: "staff.password_reset",
        entityType: "user",
        entityId: userId,
      },
    });
  });
}

export async function setStaffActive(input: { userId: string; active: boolean }): Promise<void> {
  const actor = await assertSuperAdmin();
  const parsed = setStaffActiveSchema.parse(input);

  if (actor.user.id === parsed.userId && !parsed.active) {
    throw new StaffActionError("Нельзя отключить собственный аккаунт.", "self_deactivate");
  }

  if (!parsed.active) {
    await ensureLastActiveSuperAdminSafe(parsed.userId);
  }

  const target = await prisma.user.findFirst({
    where: { id: parsed.userId, role: { in: ["admin", "super_admin", "trainer"] } },
    select: { id: true, active: true },
  });
  if (!target) {
    throw new StaffActionError("Сотрудник не найден.", "staff_not_found");
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: parsed.userId },
      data: { active: parsed.active },
    });
    await tx.auditLog.create({
      data: {
        actorUserId: actor.user.id,
        action: getStaffAuditAction(parsed.active ? "activate" : "deactivate"),
        entityType: "user",
        entityId: parsed.userId,
        detail: {
          old: { active: target.active },
          new: { active: parsed.active },
        },
      },
    });
  });
}

export async function changeStaffRole(input: { userId: string; role: "admin" | "super_admin" }): Promise<void> {
  const actor = await assertSuperAdmin();
  const parsed = changeStaffRoleSchema.parse(input);

  if (actor.user.id === parsed.userId && parsed.role !== "super_admin") {
    throw new StaffActionError("Нельзя понизить собственную роль.", "self_demote");
  }

  const target = await prisma.user.findFirst({
    where: { id: parsed.userId, role: { in: ["admin", "super_admin"] } },
    select: { id: true, role: true, active: true },
  });
  if (!target) {
    throw new StaffActionError("Можно менять роль только администраторам.", "staff_not_found");
  }

  if (target.role === "super_admin" && parsed.role === "admin" && target.active) {
    await ensureLastActiveSuperAdminSafe(parsed.userId);
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: parsed.userId },
      data: { role: parsed.role },
    });
    await tx.auditLog.create({
      data: {
        actorUserId: actor.user.id,
        action: "staff.role_change",
        entityType: "user",
        entityId: parsed.userId,
        detail: {
          old: { role: target.role },
          new: { role: parsed.role },
        },
      },
    });
  });
}

export async function relinkTrainerInstructor(input: { userId: string; instructorId: string | null }): Promise<void> {
  const actor = await assertSuperAdmin();
  const parsed = relinkTrainerInstructorSchema.parse(input);

  const target = await prisma.user.findFirst({
    where: { id: parsed.userId, role: "trainer" },
    select: { id: true, instructorId: true },
  });
  if (!target) {
    throw new StaffActionError("Тренерский аккаунт не найден.", "staff_not_found");
  }

  if (parsed.instructorId) {
    await assertInstructorCanBeLinked(parsed.instructorId, parsed.userId);
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: parsed.userId },
      data: { instructorId: parsed.instructorId },
    });
    await tx.auditLog.create({
      data: {
        actorUserId: actor.user.id,
        action: parsed.instructorId ? "staff.trainer_link" : "staff.trainer_unlink",
        entityType: "user",
        entityId: parsed.userId,
        detail: {
          old: { instructorId: target.instructorId },
          new: { instructorId: parsed.instructorId },
        },
      },
    });
  });
}
