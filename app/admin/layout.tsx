import type { Metadata } from "next";
import { requireAdmin } from "@/src/lib/auth/guards";
import { AdminShellFrame } from "@/src/components/admin/admin-shell-frame";
import { signOut } from "@/auth";
import { buildPageMetadata } from "@/src/lib/seo/metadata";

export const metadata: Metadata = {
  ...buildPageMetadata({
    title: "Админ-панель | Padel & Squash KZ",
    description: "Раздел администрирования клуба: управление бронированиями, ресурсами, ценами и расписанием.",
    path: "/admin",
    noIndex: true,
  }),
  robots: {
    index: false,
    follow: false,
  },
};

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAdmin();

  async function logoutAction() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  return (
    <AdminShellFrame email={session.user.email ?? "admin"} logoutAction={logoutAction}>
      {children}
    </AdminShellFrame>
  );
}
