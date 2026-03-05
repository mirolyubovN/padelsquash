import { canAccessAdminPortal, canAccessTrainerPortal, normalizeRole } from "@/src/lib/auth/roles";

type SessionLike = {
  user?: {
    role?: string | null;
  } | null;
} | null;

export function getPublicPortalLink(session: SessionLike): { href: string; label: string } {
  if (!session?.user) {
    return {
      href: "/login",
      label: "Войти / Регистрация",
    };
  }

  const role = normalizeRole(session.user.role);

  if (canAccessAdminPortal(role)) {
    return {
      href: "/admin",
      label: "Админ-панель",
    };
  }

  if (canAccessTrainerPortal(role)) {
    return {
      href: "/trainer/schedule",
      label: "Кабинет тренера",
    };
  }

  return {
    href: "/account",
    label: "Аккаунт",
  };
}
