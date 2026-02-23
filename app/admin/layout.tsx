import { requireAdmin } from "@/src/lib/auth/guards";
import { signOut } from "@/auth";

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
    <div className="admin-shell">
      <div className="admin-shell__toolbar">
        <div className="admin-shell__identity">
          <span className="admin-shell__badge">admin</span>
          <span className="admin-shell__email">{session.user.email}</span>
        </div>
        <form action={logoutAction}>
          <button type="submit" className="admin-shell__logout">
            Выйти
          </button>
        </form>
      </div>
      {children}
    </div>
  );
}
