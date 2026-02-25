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

  if (session.user.role === "admin") {
    return {
      href: "/admin",
      label: "Админ-панель",
    };
  }

  return {
    href: "/account",
    label: "Аккаунт",
  };
}
