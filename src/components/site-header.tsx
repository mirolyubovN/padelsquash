import { auth } from "@/auth";
import { signOut } from "@/auth";
import { getPublicPortalLink } from "@/src/lib/auth/public-nav";
import { SiteHeaderClient } from "@/src/components/site-header-client";
import { normalizeRole, canAccessTrainerPortal } from "@/src/lib/auth/roles";

export async function SiteHeader() {
  const session = await auth();
  const portalLink = getPublicPortalLink(session);
  const role = normalizeRole(session?.user?.role);
  const isAuthenticated = Boolean(session?.user);
  const isTrainer = canAccessTrainerPortal(role);

  async function logoutAction() {
    "use server";
    await signOut({ redirectTo: "/" });
  }

  return (
    <SiteHeaderClient
      portalLink={portalLink}
      logoutAction={isAuthenticated ? logoutAction : undefined}
      accountLink={isTrainer ? { href: "/account", label: "Аккаунт" } : undefined}
    />
  );
}
