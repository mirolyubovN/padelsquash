import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminPageShell } from "@/src/components/admin/admin-page-shell";
import { assertAdmin } from "@/src/lib/auth/guards";
import { canViewRevenue } from "@/src/lib/auth/roles";
import { getInstructorSchedulePageData } from "@/src/lib/admin/resources";
import { getTrainerEarnings } from "@/src/lib/trainer/earnings";
import { buildPageMetadata } from "@/src/lib/seo/metadata";

export const metadata = buildPageMetadata({
  title: "Тренер | Админ",
  description: "Профиль тренера: сессии и заработки.",
  path: "/admin/instructors",
  noIndex: true,
});

export const dynamic = "force-dynamic";

const BOOKING_STATUS_LABELS = {
  pending_payment: "Ожидает оплаты",
  confirmed: "Подтверждено",
  cancelled: "Отменено",
  completed: "Завершено",
  no_show: "Неявка",
} as const;

function getEarningsDateRange(period: string): { dateFrom: string; dateTo: string; label: string } {
  const now = new Date();
  const almaty = new Date(now.getTime() + 5 * 60 * 60 * 1000);

  if (period === "week") {
    const day = almaty.getUTCDay();
    const monday = new Date(almaty);
    monday.setUTCDate(almaty.getUTCDate() + (day === 0 ? -6 : 1 - day));
    const sunday = new Date(monday);
    sunday.setUTCDate(monday.getUTCDate() + 6);
    return {
      dateFrom: monday.toISOString().split("T")[0],
      dateTo: sunday.toISOString().split("T")[0],
      label: "Эта неделя",
    };
  }

  const year = almaty.getUTCFullYear();
  const month = almaty.getUTCMonth();
  const firstDay = new Date(Date.UTC(year, month, 1));
  const lastDay = new Date(Date.UTC(year, month + 1, 0));
  return {
    dateFrom: firstDay.toISOString().split("T")[0],
    dateTo: lastDay.toISOString().split("T")[0],
    label: almaty.toLocaleString("ru-RU", { month: "long", year: "numeric", timeZone: "Asia/Almaty" }),
  };
}

export default async function AdminInstructorProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ period?: string }>;
}) {
  const session = await assertAdmin();
  const canSeeRevenue = canViewRevenue(session.user.role);
  const { id } = await params;
  const { period } = await searchParams;
  const earningsPeriod = period === "week" ? "week" : "month";
  const { dateFrom, dateTo, label: periodLabel } = getEarningsDateRange(earningsPeriod);

  const [data, earnings] = await Promise.all([
    getInstructorSchedulePageData(id).catch(() => null),
    canSeeRevenue ? getTrainerEarnings(id, dateFrom, dateTo) : Promise.resolve(null),
  ]);

  if (!data) notFound();

  const { instructor, sessions } = data;

  return (
    <AdminPageShell
      title={`Тренер: ${instructor.name}`}
      description="Профиль тренера: сессии, история и заработки."
    >
      {/* Info */}
      <div className="admin-form admin-form--panel">
        <div className="admin-form__panel-grid">
          <div className="admin-form__group">
            <label className="admin-form__label">Виды спорта и ставка</label>
            <input
              className="admin-form__field"
              value={
                instructor.sports.length > 0
                  ? instructor.sports.map((s) => `${s.name}: ${Number(s.pricePerHour).toLocaleString("ru-KZ")} ₸/ч`).join(", ")
                  : "—"
              }
              readOnly
            />
          </div>
          <div className="admin-form__group">
            <label className="admin-form__label">Описание</label>
            <input className="admin-form__field" value={instructor.bio ?? "—"} readOnly />
          </div>
          <div className="admin-form__group">
            <label className="admin-form__label">Статус</label>
            <input className="admin-form__field" value={instructor.active ? "Активен" : "Неактивен"} readOnly />
          </div>
        </div>
        <div className="admin-form__actions">
          <Link href={`/admin/instructors/${id}/schedule`} className="admin-bookings__action-button">
            График и расписание
          </Link>
          <Link href="/admin/instructors" className="admin-bookings__action-button">
            ← Все тренеры
          </Link>
        </div>
      </div>

      {/* Earnings — super admin only */}
      {canSeeRevenue && earnings ? (
        <section className="admin-section">
          <div className="admin-section__head">
            <h2 className="admin-section__title">Заработки</h2>
            <div className="admin-calendar__view-toggle">
              <Link
                href={`/admin/instructors/${id}?period=month`}
                className={`admin-bookings__action-button${earningsPeriod === "month" ? " admin-bookings__action-button--active" : ""}`}
              >
                Этот месяц
              </Link>
              <Link
                href={`/admin/instructors/${id}?period=week`}
                className={`admin-bookings__action-button${earningsPeriod === "week" ? " admin-bookings__action-button--active" : ""}`}
              >
                Эта неделя
              </Link>
            </div>
          </div>

          <div className="trainer-earnings__summary">
            <div className="trainer-earnings__card">
              <div className="trainer-earnings__card-label">{periodLabel}</div>
              <div className="trainer-earnings__card-total">{earnings.totalKzt}</div>
              <div className="trainer-earnings__card-count">{earnings.sessionCount} завершённых сессий</div>
            </div>
          </div>

          {earnings.rows.length > 0 ? (
            <div className="admin-table">
              <table className="admin-table__table">
                <thead>
                  <tr className="admin-table__row">
                    <th className="admin-table__cell admin-table__cell--head">Дата</th>
                    <th className="admin-table__cell admin-table__cell--head">Время</th>
                    <th className="admin-table__cell admin-table__cell--head">Услуга</th>
                    <th className="admin-table__cell admin-table__cell--head">Клиент</th>
                    <th className="admin-table__cell admin-table__cell--head">Сумма</th>
                  </tr>
                </thead>
                <tbody>
                  {earnings.rows.map((row) => (
                    <tr key={row.bookingId} className="admin-table__row">
                      <td className="admin-table__cell">{row.date}</td>
                      <td className="admin-table__cell">{row.time}</td>
                      <td className="admin-table__cell">{row.serviceName}</td>
                      <td className="admin-table__cell">{row.customerName}</td>
                      <td className="admin-table__cell">{row.amountKzt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="admin-section__description">Нет завершённых сессий за выбранный период.</p>
          )}
        </section>
      ) : null}

      {/* Sessions */}
      <section className="admin-section">
        <div className="admin-section__head">
          <h2 className="admin-section__title">Последние сессии</h2>
        </div>
        <div className="admin-table">
          <table className="admin-table__table">
            <thead>
              <tr className="admin-table__row">
                <th className="admin-table__cell admin-table__cell--head">Дата</th>
                <th className="admin-table__cell admin-table__cell--head">Время</th>
                <th className="admin-table__cell admin-table__cell--head">Услуга</th>
                <th className="admin-table__cell admin-table__cell--head">Клиент</th>
                <th className="admin-table__cell admin-table__cell--head">Корт</th>
                <th className="admin-table__cell admin-table__cell--head">Статус</th>
              </tr>
            </thead>
            <tbody>
              {sessions.length === 0 ? (
                <tr className="admin-table__row">
                  <td className="admin-table__cell" colSpan={6}>Сессий пока нет.</td>
                </tr>
              ) : (
                sessions.map((row) => (
                  <tr key={row.id} className="admin-table__row">
                    <td className="admin-table__cell">{row.date}</td>
                    <td className="admin-table__cell">{row.time}</td>
                    <td className="admin-table__cell">{row.serviceName}</td>
                    <td className="admin-table__cell">
                      <div className="admin-bookings__cell-title">{row.customerName}</div>
                      <div className="admin-bookings__cell-sub">{row.customerEmail}</div>
                    </td>
                    <td className="admin-table__cell">{row.courtLabel ?? "—"}</td>
                    <td className="admin-table__cell">{BOOKING_STATUS_LABELS[row.status]}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </AdminPageShell>
  );
}
