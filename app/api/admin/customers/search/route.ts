import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { canAccessAdminPortal, normalizeRole } from "@/src/lib/auth/roles";
import { prisma } from "@/src/lib/prisma";
import { buildRussianYoVariants } from "@/src/lib/search/russian";

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
  const query = url.searchParams.get("q")?.trim() ?? "";
  const yoAwareNameQueries = buildRussianYoVariants(query);
  const normalizedDigits = query.replace(/\D/g, "");

  if (query.length < 2 && normalizedDigits.length < 4) {
    return NextResponse.json({ customers: [] });
  }

  const customers = await prisma.user.findMany({
    where: {
      role: "customer",
      OR: [
        ...yoAwareNameQueries.map((nameQuery) => ({
          name: { contains: nameQuery, mode: "insensitive" as const },
        })),
        { phone: { contains: query } },
        ...(normalizedDigits.length >= 4
          ? [{ phone: { contains: normalizedDigits } }]
          : []),
      ],
    },
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    take: 12,
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      walletBalance: true,
    },
  });

  return NextResponse.json({
    customers: customers.map((customer) => ({
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      balanceKzt: Number(customer.walletBalance),
    })),
  });
}
