import { redirect } from "next/navigation";
import { auth } from "@/auth";

export async function requireAdmin() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login?next=%2Fadmin");
  }

  if (session.user.role !== "admin") {
    redirect("/unauthorized");
  }

  return session;
}

export async function requireAuthenticatedUser(nextPath = "/account") {
  const session = await auth();

  if (!session?.user) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }

  return session;
}

export async function assertAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    throw new Error("Недостаточно прав");
  }
  return session;
}

export async function isAdminSession(): Promise<boolean> {
  const session = await auth();
  return session?.user?.role === "admin";
}
