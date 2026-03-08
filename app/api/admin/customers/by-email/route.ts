import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { normalizeRole, canAccessAdminPortal } from "@/src/lib/auth/roles";
import { prisma } from "@/src/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!canAccessAdminPortal(normalizeRole(session.user.role))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const email = url.searchParams.get("email")?.trim().toLowerCase();

  if (!email) {
    return NextResponse.json({ found: false });
  }

  const customer = await prisma.user.findFirst({
    where: { email, role: "customer" },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      walletBalance: true,
    },
  });

  if (!customer) {
    return NextResponse.json({ found: false });
  }

  return NextResponse.json({
    found: true,
    customer: {
      id: customer.id,
      email: customer.email,
      name: customer.name,
      phone: customer.phone,
      balanceKzt: Number(customer.walletBalance),
    },
  });
}
