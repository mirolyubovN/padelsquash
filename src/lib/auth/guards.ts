import { redirect } from "next/navigation";
import type { Session } from "next-auth";
import { auth } from "@/auth";
import {
  canAccessAdminPortal,
  canAccessTrainerPortal,
  canManagePricing,
  normalizeRole,
  type AppRole,
} from "@/src/lib/auth/roles";

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

export async function requireAdmin() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login?next=%2Fadmin");
  }

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

  return withRole(session, normalizeRole(session.user.role));
}

export async function assertAdmin() {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Недостаточно прав");
  }
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
  return canAccessAdminPortal(normalizeRole(session.user.role));
}
