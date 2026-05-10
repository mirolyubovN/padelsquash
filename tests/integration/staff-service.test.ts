import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/src/lib/prisma";
import {
  StaffActionError,
  createStaffMember,
  setStaffActive,
} from "@/src/lib/admin/staff";
import { assertAdmin } from "@/src/lib/auth/guards";
import { uniqueEmail } from "./helpers";

const authMock = vi.hoisted(() => ({
  session: null as null | {
    user: {
      id: string;
      email: string;
      role: string;
      instructorId: string | null;
    };
  },
}));

vi.mock("@/auth", () => ({
  auth: vi.fn(() => Promise.resolve(authMock.session)),
}));

async function useSeededSuperAdminSession() {
  const superAdmin = await prisma.user.findFirstOrThrow({
    where: { role: "super_admin", active: true },
    select: { id: true, email: true },
  });

  authMock.session = {
    user: {
      id: superAdmin.id,
      email: superAdmin.email,
      role: "super_admin",
      instructorId: null,
    },
  };

  return superAdmin;
}

describe("staff service integration", () => {
  beforeEach(async () => {
    await useSeededSuperAdminSession();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("creates an admin with an activation password placeholder and audit log", async () => {
    const email = uniqueEmail("staff-admin");

    const created = await createStaffMember({
      name: "Тестовый администратор",
      email,
      phone: "+77075550101",
      role: "admin",
      passwordMode: "activation_link",
    });

    const [user, audit] = await Promise.all([
      prisma.user.findUnique({
        where: { id: created.id },
        select: { email: true, role: true, active: true, passwordHash: true },
      }),
      prisma.auditLog.findFirst({
        where: {
          action: "staff.create",
          entityType: "user",
          entityId: created.id,
        },
      }),
    ]);

    expect(user).toMatchObject({
      email,
      role: "admin",
      active: true,
    });
    expect(user?.passwordHash.startsWith("staff-created-")).toBe(true);
    expect(audit).toBeTruthy();
  });

  it("creates a trainer and inline instructor resources transactionally", async () => {
    const [sport, location] = await Promise.all([
      prisma.sport.findFirstOrThrow({ where: { active: true }, select: { id: true } }),
      prisma.location.findFirstOrThrow({ where: { active: true }, select: { id: true } }),
    ]);
    const email = uniqueEmail("staff-trainer");

    const created = await createStaffMember({
      name: "Тестовый тренер",
      email,
      phone: "+77075550102",
      role: "trainer",
      passwordMode: "activation_link",
      instructorMode: "create_new",
      newInstructor: {
        name: "Карточка тестового тренера",
        bio: "Интеграционный тест",
        sportPrices: [{ sportId: sport.id, pricePerHour: 12345 }],
        locationIds: [location.id],
      },
    });

    const user = await prisma.user.findUniqueOrThrow({
      where: { id: created.id },
      include: {
        instructor: {
          include: {
            instructorSports: true,
            instructorLocations: true,
          },
        },
      },
    });

    expect(user.role).toBe("trainer");
    expect(user.instructorId).toBeTruthy();
    expect(user.instructor?.instructorSports).toHaveLength(1);
    expect(Number(user.instructor?.instructorSports[0]?.pricePerHour ?? 0)).toBe(12345);
    expect(user.instructor?.instructorLocations).toHaveLength(1);
  });

  it("prevents a super admin from deactivating their own account", async () => {
    const actor = await useSeededSuperAdminSession();

    await expect(setStaffActive({ userId: actor.id, active: false })).rejects.toMatchObject({
      code: "self_deactivate",
    } satisfies Partial<StaffActionError>);
  });

  it("rejects guarded access for an inactive admin session", async () => {
    const inactiveAdmin = await prisma.user.create({
      data: {
        name: "Отключенный администратор",
        email: uniqueEmail("inactive-admin"),
        phone: "+77075550103",
        passwordHash: "test-password-hash",
        role: "admin",
        active: false,
      },
      select: { id: true, email: true },
    });

    authMock.session = {
      user: {
        id: inactiveAdmin.id,
        email: inactiveAdmin.email,
        role: "admin",
        instructorId: null,
      },
    };

    await expect(assertAdmin()).rejects.toThrow("Аккаунт отключен");
  });
});
