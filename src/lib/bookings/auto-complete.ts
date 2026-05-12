import { prisma } from "@/src/lib/prisma";

export async function completePastConfirmedBookings(now: Date = new Date()): Promise<number> {
  const result = await prisma.booking.updateMany({
    where: {
      status: "confirmed",
      endAt: { lt: now },
    },
    data: { status: "completed" },
  });

  return result.count;
}
