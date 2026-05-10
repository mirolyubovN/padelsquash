import { redirect } from "next/navigation";
import type { Session } from "next-auth";
import { auth } from "@/auth";
import { prisma } from "@/src/lib/prisma";
import {
  canAccessAdminPortal,
  canAccessTrainerPortal,
  canManagePricing,
  normalizeRole,
  type AppRole,
} from "@/src/lib/auth/roles";
import { isCustomerFullyVerified } from "@/src/lib/auth/verification";

type SessionWithRole = Session & {
  user: NonNullable<Session["user"]> & {
    role: AppRole;
    instructorId: string | null;
  };
};

function withRole(session: Session, role: AppRole): SessionWithRole {
  if (!session?.user) {
    throw new Error("Сессия отсутствует");
  }

  return {
    ...session,
    user: {
      ...session.user,
      role,
      instructorId: typeof session.user.instructorId === "string" ? session.user.instructorId : null,
    },
  };
}

async function getSessionUserActive(session: Session): Promise<boolean> {
  const userId = typeof session.user?.id === "string" ? session.user.id : "";
  if (!userId) {
    return false;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { active: true },
  });

  return Boolean(user?.active);
}

async function requireActiveSessionUser(session: Session): Promise<void> {
  if (!(await getSessionUserActive(session))) {
    redirect("/login?error=account_disabled");
  }
}

async function assertActiveSessionUser(session: Session): Promise<void> {
  if (!(await getSessionUserActive(session))) {
    throw new Error("Аккаунт отключен");
  }
}

export async function requireAdmin() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login?next=%2Fadmin");
  }

  await requireActiveSessionUser(session);
  const role = normalizeRole(session.user.role);

  if (!canAccessAdminPortal(role)) {
    redirect("/unauthorized");
  }

  return withRole(session, role);
}

export async function requireSuperAdmin() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login?next=%2Fadmin");
  }

  await requireActiveSessionUser(session);
  const role = normalizeRole(session.user.role);

  if (!canManagePricing(role)) {
    redirect("/unauthorized");
  }

  return withRole(session, role);
}

export async function requireTrainer(nextPath = "/trainer/schedule") {
  const session = await auth();

  if (!session?.user) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }

  await requireActiveSessionUser(session);
  const role = normalizeRole(session.user.role);
  const instructorId = typeof session.user.instructorId === "string" ? session.user.instructorId : null;

  if (!canAccessTrainerPortal(role) || !instructorId) {
    redirect("/unauthorized");
  }

  return withRole(session, role);
}

export async function requireInstructorScheduleAccess(instructorId: string, nextPath: string) {
  const session = await auth();

  if (!session?.user) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }

  await requireActiveSessionUser(session);
  const role = normalizeRole(session.user.role);
  const sessionInstructorId =
    typeof session.user.instructorId === "string" ? session.user.instructorId : null;

  if (canAccessAdminPortal(role)) {
    return withRole(session, role);
  }

  if (canAccessTrainerPortal(role) && sessionInstructorId === instructorId) {
    return withRole(session, role);
  }

  redirect("/unauthorized");
}

export async function requireAuthenticatedUser(nextPath = "/account") {
  const session = await auth();

  if (!session?.user) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }

  await requireActiveSessionUser(session);
  const role = normalizeRole(session.user.role);
  if (role === "customer") {
    const userId = typeof session.user.id === "string" ? session.user.id : "";
    const user = userId
      ? await prisma.user.findUnique({
          where: { id: userId },
          select: {
            email: true,
            role: true,
            emailVerifiedAt: true,
            phoneVerifiedAt: true,
            pendingEmail: true,
            pendingPhone: true,
          },
        })
      : null;

    if (
      user &&
      !isCustomerFullyVerified({
        role: user.role,
        emailVerifiedAt: user.emailVerifiedAt,
        phoneVerifiedAt: user.phoneVerifiedAt,
        pendingEmail: user.pendingEmail,
        pendingPhone: user.pendingPhone,
      })
    ) {
      redirect(`/register/verify?email=${encodeURIComponent(user.email)}&next=${encodeURIComponent(nextPath)}`);
    }
  }

  return withRole(session, role);
}

export async function assertAdmin() {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Недостаточно прав");
  }
  await assertActiveSessionUser(session);
  const role = normalizeRole(session.user.role);
  if (!canAccessAdminPortal(role)) {
    throw new Error("Недостаточно прав");
  }
  return withRole(session, role);
}

export async function assertSuperAdmin() {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Недостаточно прав");
  }
  await assertActiveSessionUser(session);
  const role = normalizeRole(session.user.role);
  if (!canManagePricing(role)) {
    throw new Error("Недостаточно прав");
  }
  return withRole(session, role);
}

export async function assertTrainer() {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Недостаточно прав");
  }
  await assertActiveSessionUser(session);
  const role = normalizeRole(session.user.role);
  const instructorId = typeof session.user.instructorId === "string" ? session.user.instructorId : null;
  if (!canAccessTrainerPortal(role) || !instructorId) {
    throw new Error("Недостаточно прав");
  }
  return withRole(session, role);
}

export async function assertInstructorScheduleAccess(instructorId: string) {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Недостаточно прав");
  }
  await assertActiveSessionUser(session);

  const role = normalizeRole(session.user.role);
  const sessionInstructorId =
    typeof session.user.instructorId === "string" ? session.user.instructorId : null;

  if (canAccessAdminPortal(role)) {
    return withRole(session, role);
  }

  if (canAccessTrainerPortal(role) && sessionInstructorId === instructorId) {
    return withRole(session, role);
  }

  throw new Error("Недостаточно прав");
}

export async function isAdminSession(): Promise<boolean> {
  const session = await auth();
  if (!session?.user) {
    return false;
  }
  if (!(await getSessionUserActive(session))) {
    return false;
  }
  return canAccessAdminPortal(normalizeRole(session.user.role));
}
