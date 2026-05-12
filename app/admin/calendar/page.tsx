import Link from "next/link";
import { AdminPageShell } from "@/src/components/admin/admin-page-shell";
import { assertAdmin } from "@/src/lib/auth/guards";
import {
  getCalendarDayData,
  getCalendarWeekData,
  getAdjacentDate,
  getMondayOfWeek,
  formatCalendarDate,
  type CalendarBooking,
  type CalendarException,
} from "@/src/lib/admin/calendar";
import { t } from "@/src/lib/i18n";
import { buildPageMetadata } from "@/src/lib/seo/metadata";
import { venueDateTimeToUtc } from "@/src/lib/time/venue-timezone";

export const metadata = buildPageMetadata({
  title: "Расписание | Админ",
  description: "Расписание бронирований по кортам на день.",
  path: "/admin/calendar",
  noIndex: true,
});

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<CalendarBooking["status"], string> = {
  pending_payment: t("admin.calendar.status.pendingPayment"),
  confirmed: t("admin.calendar.status.confirmed"),
  cancelled: t("admin.calendar.status.cancelled"),
  completed: t("admin.calendar.status.completed"),
  no_show: t("admin.calendar.status.noShow"),
};

function getTodayVenueDate(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: process.env.APP_TIMEZONE ?? "Asia/Almaty",
  }).format(new Date());
}

export default async function AdminCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; location?: string; view?: string }>;
}) {
  await assertAdmin();

  const params = await searchParams;
  const today = getTodayVenueDate();
  const date = /^\d{4}-\d{2}-\d{2}$/.test(params.date ?? "") ? (params.date as string) : today;
  const locationSlug = params.location;
  const view = params.view === "week" ? "week" : "day";

  // Week view branch
  if (view === "week") {
    const monday = getMondayOfWeek(date);
    const prevMonday = getAdjacentDate(monday, -7);
    const nextMonday = getAdjacentDate(monday, +7);
    const todayMonday = getMondayOfWeek(today);
    const weekData = await getCalendarWeekData(monday, locationSlug);

    const DAY_NAMES = [
      t("admin.calendar.weekdays.monShort"),
      t("admin.calendar.weekdays.tueShort"),
      t("admin.calendar.weekdays.wedShort"),
      t("admin.calendar.weekdays.thuShort"),
      t("admin.calendar.weekdays.friShort"),
      t("admin.calendar.weekdays.satShort"),
      t("admin.calendar.weekdays.sunShort"),
    ];
    const MONTH_NAMES = [
      t("admin.calendar.months.janShort"),
      t("admin.calendar.months.febShort"),
      t("admin.calendar.months.marShort"),
      t("admin.calendar.months.aprShort"),
      t("admin.calendar.months.mayShort"),
      t("admin.calendar.months.junShort"),
      t("admin.calendar.months.julShort"),
      t("admin.calendar.months.augShort"),
      t("admin.calendar.months.sepShort"),
      t("admin.calendar.months.octShort"),
      t("admin.calendar.months.novShort"),
      t("admin.calendar.months.decShort"),
    ];

    function buildWeekNavLink(targetMonday: string) {
      const q = new URLSearchParams({ view: "week", date: targetMonday });
      if (locationSlug) q.set("location", locationSlug);
      return `/admin/calendar?${q.toString()}`;
    }

    function buildDayLink(dayDate: string) {
      const q = new URLSearchParams({ date: dayDate });
      if (locationSlug) q.set("location", locationSlug);
      return `/admin/calendar?${q.toString()}`;
    }

    return (
      <AdminPageShell title={t("admin.calendar.title")} description={t("admin.calendar.weekDescription")}>
        <div className="admin-calendar__nav">
          <Link href={buildWeekNavLink(prevMonday)} className="admin-calendar__nav-btn">{t("admin.calendar.nav.previousWeek")}</Link>
          {monday !== todayMonday ? (
            <Link href={buildWeekNavLink(todayMonday)} className="admin-calendar__nav-today">{t("admin.calendar.nav.currentWeek")}</Link>
          ) : (
            <span className="admin-calendar__nav-today admin-calendar__nav-today--active">{t("admin.calendar.nav.currentWeek")}</span>
          )}
          <Link href={buildWeekNavLink(nextMonday)} className="admin-calendar__nav-btn">{t("admin.calendar.nav.nextWeek")}</Link>
          <Link href={buildDayLink(today)} className="admin-calendar__view-toggle">{t("admin.calendar.view.day")}</Link>
        </div>

        <div className="admin-calendar__week-grid">
          {weekData.days.map((cell, i) => {
            const d = new Date(`${cell.date}T12:00:00Z`);
            const dayLabel = DAY_NAMES[i];
            const dateLabel = `${d.getUTCDate()} ${MONTH_NAMES[d.getUTCMonth()]}`;
            const isToday = cell.date === today;
            const occupancyClass =
              cell.occupancy === 2
                ? "admin-calendar__week-cell--full"
                : cell.occupancy === 1
                  ? "admin-calendar__week-cell--partial"
                  : "admin-calendar__week-cell--free";

            return (
              <Link
                key={cell.date}
                href={buildDayLink(cell.date)}
                className={`admin-calendar__week-cell ${occupancyClass}${isToday ? " admin-calendar__week-cell--today" : ""}`}
              >
                <span className="admin-calendar__week-day">{dayLabel}</span>
                <span className="admin-calendar__week-date">{dateLabel}</span>
                <span className="admin-calendar__week-stat">
                  {cell.bookingCount}/{cell.courtCount}
                </span>
              </Link>
            );
          })}
        </div>

        <div className="admin-calendar__legend">
          <span className="admin-calendar__legend-item admin-calendar__legend-item--free">{t("admin.calendar.legend.free")}</span>
          <span className="admin-calendar__legend-item admin-calendar__legend-item--partial">{t("admin.calendar.legend.partiallyOccupied")}</span>
          <span className="admin-calendar__legend-item admin-calendar__legend-item--confirmed">{t("admin.calendar.legend.fullyOccupied")}</span>
        </div>
      </AdminPageShell>
    );
  }

  const data = await getCalendarDayData(date, locationSlug);

  const prevDate = getAdjacentDate(date, -1);
  const nextDate = getAdjacentDate(date, +1);
  const isToday = date === today;
  const now = new Date();

  const hours: number[] = [];
  for (let hour = data.openHour; hour < data.closeHour; hour += 1) {
    hours.push(hour);
  }

  function buildCreateLink(hour: number, courtId: string): string {
    const hh = String(hour).padStart(2, "0");
    const query = new URLSearchParams({ date, time: `${hh}:00` });
    if (courtId) query.set("court", courtId);
    if (locationSlug) query.set("location", locationSlug);
    return `/admin/bookings/create?${query.toString()}`;
  }

  function buildBookingLink(bookingId: string): string {
    const query = new URLSearchParams({ bookingId });
    return `/admin/bookings?${query.toString()}#booking-${bookingId}`;
  }

  function buildNavLink(targetDate: string): string {
    const query = new URLSearchParams({ date: targetDate });
    if (locationSlug) query.set("location", locationSlug);
    return `/admin/calendar?${query.toString()}`;
  }

  function buildWeekViewLink(): string {
    const monday = getMondayOfWeek(date);
    const query = new URLSearchParams({ view: "week", date: monday });
    if (locationSlug) query.set("location", locationSlug);
    return `/admin/calendar?${query.toString()}`;
  }

  function isPastSlot(hour: number): boolean {
    const hh = String(hour).padStart(2, "0");
    const slotStartAt = venueDateTimeToUtc(date, `${hh}:00`);
    if (slotStartAt > now) {
      return false;
    }

    const slotEndAt = new Date(slotStartAt.getTime() + 60 * 60 * 1000);
    return slotEndAt <= now;
  }

  function isPastBooking(booking: CalendarBooking): boolean {
    const endHour = String(booking.endHour).padStart(2, "0");
    return venueDateTimeToUtc(date, `${endHour}:00`) <= now;
  }

  const bookingsByCourtHour = new Map<string, CalendarBooking>();
  for (const booking of data.bookings) {
    for (let hour = booking.startHour; hour < booking.endHour; hour += 1) {
      bookingsByCourtHour.set(`${booking.courtId}:${hour}`, booking);
    }
  }

  const exceptionsByCourtHour = new Map<string, CalendarException>();
  for (const exception of data.exceptions) {
    for (let hour = exception.startHour; hour < exception.endHour; hour += 1) {
      if (exception.courtId === null) {
        for (const court of data.courts) {
          const key = `${court.id}:${hour}`;
          if (!exceptionsByCourtHour.has(key)) {
            exceptionsByCourtHour.set(key, exception);
          }
        }
      } else {
        const key = `${exception.courtId}:${hour}`;
        if (!exceptionsByCourtHour.has(key)) {
          exceptionsByCourtHour.set(key, exception);
        }
      }
    }
  }

  return (
    <AdminPageShell title={t("admin.calendar.title")} description={formatCalendarDate(date)}>
      <div className="admin-calendar__nav">
        <Link href={buildNavLink(prevDate)} className="admin-calendar__nav-btn">
          {t("admin.calendar.nav.back")}
        </Link>
        {!isToday ? (
          <Link href={buildNavLink(today)} className="admin-calendar__nav-today">
            {t("admin.calendar.nav.today")}
          </Link>
        ) : (
          <span className="admin-calendar__nav-today admin-calendar__nav-today--active">{t("admin.calendar.nav.today")}</span>
        )}
        <Link href={buildNavLink(nextDate)} className="admin-calendar__nav-btn">
          {t("admin.calendar.nav.forward")}
        </Link>
        <form method="get" action="/admin/calendar" className="admin-calendar__date-form">
          {locationSlug ? <input type="hidden" name="location" value={locationSlug} /> : null}
          <input type="date" lang="ru-RU" name="date" defaultValue={date} className="admin-form__field admin-calendar__date-input" />
          <button type="submit" className="admin-bookings__action-button">{t("admin.calendar.nav.go")}</button>
        </form>
        <Link href={buildWeekViewLink()} className="admin-calendar__view-toggle">{t("admin.calendar.view.week")}</Link>
      </div>

      {data.courts.length === 0 ? (
        <p className="admin-dashboard__empty">{t("admin.calendar.empty.noActiveCourts")}</p>
      ) : hours.length === 0 ? (
        <p className="admin-dashboard__empty">{t("admin.calendar.empty.noScheduleForDay")}</p>
      ) : (
        <div className="admin-calendar__scroll">
          <table className="admin-calendar__grid">
            <thead>
              <tr>
                <th className="admin-calendar__time-head" />
                {data.courts.map((court) => (
                  <th key={court.id} className="admin-calendar__court-head">
                    <span className="admin-calendar__court-name">{court.name}</span>
                    <span className="admin-calendar__court-sport">{court.sportName}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {hours.map((hour) => {
                const hh = String(hour).padStart(2, "0");
                return (
                  <tr key={hour} className="admin-calendar__row">
                    <td className="admin-calendar__time-cell">{hh}:00</td>
                    {data.courts.map((court) => {
                      const cellKey = `${court.id}:${hour}`;
                      const booking = bookingsByCourtHour.get(cellKey);
                      const exception = exceptionsByCourtHour.get(cellKey);

                      if (booking) {
                        if (booking.startHour !== hour) {
                          return <td key={court.id} className="admin-calendar__cell admin-calendar__cell--continuation" />;
                        }
                        const rowSpan = booking.endHour - booking.startHour;
                        const pastBookingClass = isPastBooking(booking) ? " admin-calendar__cell--past-session" : "";
                        return (
                          <td
                            key={court.id}
                            rowSpan={rowSpan}
                            className={`admin-calendar__cell admin-calendar__cell--booked admin-calendar__cell--${booking.status.replace("_", "-")}${pastBookingClass}`}
                          >
                            <Link href={buildBookingLink(booking.id)} className="admin-calendar__booking">
                              <span className="admin-calendar__booking-name">{booking.customerName}</span>
                              <span className="admin-calendar__booking-service">{booking.serviceName}</span>
                              {booking.instructorName ? (
                                <span className="admin-calendar__booking-instructor">{booking.instructorName}</span>
                              ) : null}
                              <span className="admin-calendar__booking-status">{STATUS_LABELS[booking.status]}</span>
                            </Link>
                          </td>
                        );
                      }

                      if (exception) {
                        if (exception.startHour !== hour) {
                          return <td key={court.id} className="admin-calendar__cell admin-calendar__cell--continuation" />;
                        }
                        const rowSpan = exception.endHour - exception.startHour;
                        return (
                          <td key={court.id} rowSpan={rowSpan} className="admin-calendar__cell admin-calendar__cell--blocked">
                            <span className="admin-calendar__blocked-label">
                              {exception.type === "closed" ? t("admin.calendar.exception.closed") : t("admin.calendar.exception.maintenance")}
                              {exception.note ? ` · ${exception.note}` : ""}
                            </span>
                          </td>
                        );
                      }

                      if (isPastSlot(hour)) {
                        return (
                          <td key={court.id} className="admin-calendar__cell admin-calendar__cell--free admin-calendar__cell_passed">
                            <span className="admin-calendar__free-slot" aria-disabled="true">
                              {t("admin.calendar.slot.passed")}
                            </span>
                          </td>
                        );
                      }

                      return (
                        <td key={court.id} className="admin-calendar__cell admin-calendar__cell--free">
                          <Link href={buildCreateLink(hour, court.id)} className="admin-calendar__free-slot">
                            {t("admin.calendar.slot.occupy")}
                          </Link>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="admin-calendar__legend">
        <span className="admin-calendar__legend-item admin-calendar__legend-item--confirmed">{t("admin.calendar.status.confirmed")}</span>
        <span className="admin-calendar__legend-item admin-calendar__legend-item--pending-payment">{t("admin.calendar.status.pendingPayment")}</span>
        <span className="admin-calendar__legend-item admin-calendar__legend-item--past">{t("admin.calendar.legend.pastSessions")}</span>
        <span className="admin-calendar__legend-item admin-calendar__legend-item--blocked">{t("admin.calendar.legend.blocked")}</span>
        <span className="admin-calendar__legend-item admin-calendar__legend-item--free">{t("admin.calendar.legend.free")}</span>
      </div>
    </AdminPageShell>
  );
}
