import { prisma } from "@/src/lib/prisma";
import { toVenueIsoDate, venueDateTimeToUtc } from "@/src/lib/time/venue-timezone";

function addDays(dateIso: string, days: number): string {
  const date = new Date(`${dateIso}T00:00:00`);
  date.setDate(date.getDate() + days);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function startOfWeekMonday(dateIso: string): string {
  const date = new Date(`${dateIso}T00:00:00`);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export interface AdminDashboardData {
  todayBookingsCount: number;
  pendingPaymentsCount: number;
  activeCourtsCount: number;
  activeInstructorsCount: number;
  weekRevenueKzt: number;
  recentBookings: Array<{
    id: string;
    customerName: string;
    serviceName: string;
    dateTimeText: string;
    statusLabel: string;
  }>;
  alerts: string[];
}

export async function getAdminDashboardData(): Promise<AdminDashboardData> {
  const todayIso = toVenueIsoDate(new Date());
  const tomorrowIso = addDays(todayIso, 1);
  const weekStartIso = startOfWeekMonday(todayIso);
  const nextWeekStartIso = addDays(weekStartIso, 7);
  const todayStartUtc = venueDateTimeToUtc(todayIso, "00:00");
  const tomorrowStartUtc = venueDateTimeToUtc(tomorrowIso, "00:00");
  const weekStartUtc = venueDateTimeToUtc(weekStartIso, "00:00");
  const nextWeekStartUtc = venueDateTimeToUtc(nextWeekStartIso, "00:00");
  const tomorrowDayOfWeek = new Date(`${tomorrowIso}T00:00:00`).getDay();

  const [
    todayBookingsCount,
    pendingPaymentsCount,
    activeCourtsCount,
    activeInstructorsCount,
    weekRevenueAgg,
    recentRows,
    activeInstructors,
    tomorrowSchedules,
  ] = await Promise.all([
    prisma.booking.count({
      where: {
        startAt: { gte: todayStartUtc, lt: tomorrowStartUtc },
      },
    }),
    prisma.booking.count({
      where: { status: "pending_payment" },
    }),
    prisma.court.count({ where: { active: true } }),
    prisma.instructor.count({ where: { active: true } }),
    prisma.booking.aggregate({
      where: {
        startAt: { gte: weekStartUtc, lt: nextWeekStartUtc },
        status: { in: ["confirmed", "completed"] },
      },
      _sum: { priceTotal: true },
    }),
    prisma.booking.findMany({
      take: 5,
      orderBy: { startAt: "desc" },
      include: {
        customer: { select: { name: true } },
        service: { select: { name: true } },
      },
    }),
    prisma.instructor.findMany({
      where: { active: true },
      select: {
        id: true,
        name: true,
        instructorSports: {
          select: {
            sport: {
              select: {
                slug: true,
              },
            },
          },
        },
      },
    }),
    prisma.resourceSchedule.findMany({
      where: {
        resourceType: "instructor",
        dayOfWeek: tomorrowDayOfWeek,
        active: true,
      },
      select: { resourceId: true },
    }),
  ]);

  const scheduledInstructorIds = new Set(tomorrowSchedules.map((row) => row.resourceId));
  const padelTomorrowCount = activeInstructors.filter(
    (row) =>
      row.instructorSports.some((item) => item.sport.slug === "padel") &&
      scheduledInstructorIds.has(row.id),
  ).length;
  const squashTomorrowCount = activeInstructors.filter(
    (row) =>
      row.instructorSports.some((item) => item.sport.slug === "squash") &&
      scheduledInstructorIds.has(row.id),
  ).length;

  const alerts: string[] = [];
  if (pendingPaymentsCount > 0) {
    alerts.push(`${pendingPaymentsCount} бронирований ожидают оплаты.`);
  }
  if (padelTomorrowCount === 0) {
    alerts.push("На завтра нет доступных тренеров по паделу по расписанию.");
  }
  if (squashTomorrowCount === 0) {
    alerts.push("На завтра нет доступных тренеров по сквошу по расписанию.");
  }

  return {
    todayBookingsCount,
    pendingPaymentsCount,
    activeCourtsCount,
    activeInstructorsCount,
    weekRevenueKzt: Number(weekRevenueAgg._sum.priceTotal ?? 0),
    recentBookings: recentRows.map((row) => ({
      id: row.id,
      customerName: row.customer.name,
      serviceName: row.service.name,
      dateTimeText: new Intl.DateTimeFormat("ru-KZ", {
        timeZone: process.env.APP_TIMEZONE ?? "Asia/Almaty",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(row.startAt),
      statusLabel:
        row.status === "pending_payment"
          ? "Ожидает оплаты"
          : row.status === "confirmed"
            ? "Подтверждено"
            : row.status === "cancelled"
              ? "Отменено"
              : row.status === "completed"
                ? "Завершено"
                : "Неявка",
    })),
    alerts,
  };
}
