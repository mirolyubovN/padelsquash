import { signOut } from "@/auth";
import { requireAuthenticatedUser } from "@/src/lib/auth/guards";

export const dynamic = "force-dynamic";

export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAuthenticatedUser("/account");

  async function logoutAction() {
    "use server";
    await signOut({ redirectTo: "/" });
  }

  return (
    <div className="account-shell">
      <div className="account-shell__toolbar">
        <div className="account-shell__identity">
          <span className="account-shell__badge">{session.user.role}</span>
          <span className="account-shell__email">{session.user.email}</span>
        </div>
        <form action={logoutAction}>
          <button type="submit" className="account-shell__logout">
            Выйти
          </button>
        </form>
      </div>
      {children}
    </div>
  );
}
