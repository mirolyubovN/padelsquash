import Link from "next/link";
import { AdminPageShell } from "@/src/components/admin/admin-page-shell";
import { assertAdmin } from "@/src/lib/auth/guards";
import {
  getCalendarDayData,
  getAdjacentDate,
  formatCalendarDate,
  type CalendarBooking,
  type CalendarException,
} from "@/src/lib/admin/calendar";
import { buildPageMetadata } from "@/src/lib/seo/metadata";

export const metadata = buildPageMetadata({
  title: "Расписание | Админ",
  description: "Расписание бронирований по кортам на день.",
  path: "/admin/calendar",
  noIndex: true,
});

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<CalendarBooking["status"], string> = {
  pending_payment: "Ожидает оплаты",
  confirmed: "Подтверждено",
  cancelled: "Отменено",
  completed: "Завершено",
  no_show: "Не явился",
};

function getTodayVenueDate(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: process.env.APP_TIMEZONE ?? "Asia/Almaty",
  }).format(new Date());
}

export default async function AdminCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; location?: string }>;
}) {
  await assertAdmin();

  const params = await searchParams;
  const today = getTodayVenueDate();
  const date = /^\d{4}-\d{2}-\d{2}$/.test(params.date ?? "") ? (params.date as string) : today;
  const locationSlug = params.location;

  const data = await getCalendarDayData(date, locationSlug);

  const prevDate = getAdjacentDate(date, -1);
  const nextDate = getAdjacentDate(date, +1);
  const isToday = date === today;

  const hours: number[] = [];
  for (let h = data.openHour; h < data.closeHour; h++) {
    hours.push(h);
  }

  function buildCreateLink(hour: number, courtId: string): string {
    const hh = String(hour).padStart(2, "0");
    const params = new URLSearchParams({ date, time: `${hh}:00` });
    if (courtId) params.set("court", courtId);
    return `/admin/bookings/create?${params.toString()}`;
  }

  function buildNavLink(targetDate: string): string {
    const p = new URLSearchParams({ date: targetDate });
    if (locationSlug) p.set("location", locationSlug);
    return `/admin/calendar?${p.toString()}`;
  }

  // Index bookings and exceptions for fast cell lookup
  const bookingsByCourtHour = new Map<string, CalendarBooking>();
  for (const booking of data.bookings) {
    for (let h = booking.startHour; h < booking.endHour; h++) {
      bookingsByCourtHour.set(`${booking.courtId}:${h}`, booking);
    }
  }

  const exceptionsByCourtHour = new Map<string, CalendarException>();
  for (const exc of data.exceptions) {
    for (let h = exc.startHour; h < exc.endHour; h++) {
      if (exc.courtId === null) {
        // Venue-level: applies to every court
        for (const court of data.courts) {
          const key = `${court.id}:${h}`;
          if (!exceptionsByCourtHour.has(key)) {
            exceptionsByCourtHour.set(key, exc);
          }
        }
      } else {
        const key = `${exc.courtId}:${h}`;
        if (!exceptionsByCourtHour.has(key)) {
          exceptionsByCourtHour.set(key, exc);
        }
      }
    }
  }

  return (
    <AdminPageShell
      title="Расписание"
      description={formatCalendarDate(date)}
    >
      {/* Date navigation */}
      <div className="admin-calendar__nav">
        <Link href={buildNavLink(prevDate)} className="admin-calendar__nav-btn">
          ← Назад
        </Link>
        {!isToday ? (
          <Link href={buildNavLink(today)} className="admin-calendar__nav-today">
            Сегодня
          </Link>
        ) : (
          <span className="admin-calendar__nav-today admin-calendar__nav-today--active">Сегодня</span>
        )}
        <Link href={buildNavLink(nextDate)} className="admin-calendar__nav-btn">
          Вперёд →
        </Link>
        <form method="get" action="/admin/calendar" className="admin-calendar__date-form">
          {locationSlug ? <input type="hidden" name="location" value={locationSlug} /> : null}
          <input
            type="date"
            name="date"
            defaultValue={date}
            className="admin-form__field admin-calendar__date-input"
          />
          <button type="submit" className="admin-bookings__action-button">Перейти</button>
        </form>
      </div>

      {data.courts.length === 0 ? (
        <p className="admin-dashboard__empty">Нет активных кортов. Добавьте корты в разделе «Корты».</p>
      ) : hours.length === 0 ? (
        <p className="admin-dashboard__empty">Нет расписания для этого дня.</p>
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
                        // Only render full cell on the booking's startHour
                        if (booking.startHour !== hour) {
                          return <td key={court.id} className="admin-calendar__cell admin-calendar__cell--continuation" />;
                        }
                        const rowSpan = booking.endHour - booking.startHour;
                        return (
                          <td
                            key={court.id}
                            rowSpan={rowSpan}
                            className={`admin-calendar__cell admin-calendar__cell--booked admin-calendar__cell--${booking.status.replace("_", "-")}`}
                          >
                            <Link href={`/admin/bookings?q=${encodeURIComponent(booking.customerName)}`} className="admin-calendar__booking">
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
                              {exception.type === "closed" ? "Закрыто" : "Тех. обслуживание"}
                              {exception.note ? ` · ${exception.note}` : ""}
                            </span>
                          </td>
                        );
                      }

                      return (
                        <td key={court.id} className="admin-calendar__cell admin-calendar__cell--free">
                          <Link href={buildCreateLink(hour, court.id)} className="admin-calendar__free-slot">
                            + Занять
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

      {/* Legend */}
      <div className="admin-calendar__legend">
        <span className="admin-calendar__legend-item admin-calendar__legend-item--confirmed">Подтверждено</span>
        <span className="admin-calendar__legend-item admin-calendar__legend-item--pending-payment">Ожидает оплаты</span>
        <span className="admin-calendar__legend-item admin-calendar__legend-item--blocked">Заблокировано</span>
        <span className="admin-calendar__legend-item admin-calendar__legend-item--free">Свободно</span>
      </div>
    </AdminPageShell>
  );
}
