import { formatMoneyKzt } from "@/src/lib/format/money";
import { prisma } from "@/src/lib/prisma";
import { isoToVenueTimezoneParts } from "@/src/lib/time/venue-timezone";
import { ADMIN_BOOKING_STATUS_LABELS, ADMIN_PAYMENT_STATUS_LABELS, type AdminBookingStatus, type AdminPaymentStatus } from "@/src/lib/admin/bookings";

interface AdminCustomerBookingRow {
  id: string;
  serviceName: string;
  sportName: string;
  date: string;
  time: string;
  status: AdminBookingStatus;
  statusLabel: string;
  paymentStatus: AdminPaymentStatus;
  paymentStatusLabel: string;
  amountKzt: string;
  courtLabels: string[];
  instructorLabels: string[];
}

interface AdminCustomerWalletRow {
  id: string;
  createdAtIso: string;
  type: string;
  amountKzt: string;
  balanceAfterKzt: string;
  note: string;
}

export interface AdminCustomerProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  createdAtIso: string;
  balanceKzt: string;
  totalBookings: number;
  upcomingBookings: number;
  cancelledBookings: number;
  completedBookings: number;
  noShowBookings: number;
  bookings: AdminCustomerBookingRow[];
  walletTransactions: AdminCustomerWalletRow[];
}

function resolvePaymentStatus(raw: string | null, bookingStatus: AdminBookingStatus): AdminPaymentStatus {
  if (raw === "unpaid" || raw === "paid" || raw === "failed" || raw === "refunded") {
    return raw;
  }
  if (!raw && bookingStatus === "confirmed") {
    return "paid";
  }
  return "none";
}

export async function getAdminCustomerProfile(customerId: string): Promise<AdminCustomerProfile | null> {
  const user = await prisma.user.findFirst({
    where: { id: customerId, role: "customer" },
    include: {
      bookings: {
        orderBy: [{ startAt: "desc" }],
        include: {
          service: {
            include: {
              sport: {
                select: { name: true },
              },
            },
          },
          payment: true,
          resources: true,
        },
      },
      walletTransactions: {
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          createdAt: true,
          type: true,
          amount: true,
          balanceAfter: true,
          note: true,
        },
      },
    },
  });

  if (!user) {
    return null;
  }

  const courtIds = new Set<string>();
  const instructorIds = new Set<string>();
  for (const booking of user.bookings) {
    for (const resource of booking.resources) {
      if (resource.resourceType === "court") {
        courtIds.add(resource.resourceId);
      } else if (resource.resourceType === "instructor") {
        instructorIds.add(resource.resourceId);
      }
    }
  }

  const [courts, instructors] = await Promise.all([
    courtIds.size
      ? prisma.court.findMany({
          where: { id: { in: Array.from(courtIds) } },
          select: { id: true, name: true },
        })
      : Promise.resolve([]),
    instructorIds.size
      ? prisma.instructor.findMany({
          where: { id: { in: Array.from(instructorIds) } },
          select: { id: true, name: true },
        })
      : Promise.resolve([]),
  ]);

  const courtNames = new Map(courts.map((row) => [row.id, row.name]));
  const instructorNames = new Map(instructors.map((row) => [row.id, row.name]));

  const bookings = user.bookings.map((booking) => {
    const start = isoToVenueTimezoneParts(booking.startAt);
    const end = isoToVenueTimezoneParts(booking.endAt);
    const status = booking.status as AdminBookingStatus;
    const paymentStatus = resolvePaymentStatus(booking.payment?.status ?? null, status);

    const courtLabels = booking.resources
      .filter((resource) => resource.resourceType === "court")
      .map((resource) => courtNames.get(resource.resourceId) ?? resource.resourceId);
    const instructorLabels = booking.resources
      .filter((resource) => resource.resourceType === "instructor")
      .map((resource) => instructorNames.get(resource.resourceId) ?? resource.resourceId);

    return {
      id: booking.id,
      serviceName: booking.service.name,
      sportName: booking.service.sport.name,
      date: start.date,
      time: `${start.time} - ${end.time}`,
      status,
      statusLabel: ADMIN_BOOKING_STATUS_LABELS[status],
      paymentStatus,
      paymentStatusLabel: ADMIN_PAYMENT_STATUS_LABELS[paymentStatus],
      amountKzt: formatMoneyKzt(Number(booking.priceTotal)),
      courtLabels,
      instructorLabels,
    } satisfies AdminCustomerBookingRow;
  });

  const totalBookings = bookings.length;
  const upcomingBookings = bookings.filter((booking) => booking.status === "confirmed").length;
  const cancelledBookings = bookings.filter((booking) => booking.status === "cancelled").length;
  const completedBookings = bookings.filter((booking) => booking.status === "completed").length;
  const noShowBookings = bookings.filter((booking) => booking.status === "no_show").length;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    createdAtIso: user.createdAt.toISOString(),
    balanceKzt: formatMoneyKzt(Number(user.walletBalance)),
    totalBookings,
    upcomingBookings,
    cancelledBookings,
    completedBookings,
    noShowBookings,
    bookings,
    walletTransactions: user.walletTransactions.map((row) => ({
      id: row.id,
      createdAtIso: row.createdAt.toISOString(),
      type: row.type,
      amountKzt: formatMoneyKzt(Number(row.amount)),
      balanceAfterKzt: formatMoneyKzt(Number(row.balanceAfter)),
      note: row.note ?? "—",
    })),
  };
}
