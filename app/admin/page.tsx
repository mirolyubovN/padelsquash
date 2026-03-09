import Link from "next/link";
import { AdminPageShell } from "@/src/components/admin/admin-page-shell";
import { getAdminDashboardData } from "@/src/lib/admin/dashboard";
import { assertAdmin } from "@/src/lib/auth/guards";
import { canViewRevenue } from "@/src/lib/auth/roles";
import { buildPageMetadata } from "@/src/lib/seo/metadata";

export const metadata = buildPageMetadata({
  title: "Админ-панель | Padel & Squash KZ",
  description: "Главная страница админ-панели со сводной статистикой, оповещениями и быстрыми действиями для управления клубом.",
  path: "/admin",
  noIndex: true,
});

export default async function AdminIndexPage() {
  const session = await assertAdmin();
  const canSeeRevenue = canViewRevenue(session.user.role);
  const dashboard = await getAdminDashboardData();
  return (
    <AdminPageShell
      title="Панель управления"
      description="Короткая операционная сводка и быстрые переходы по ключевым задачам."
    >
      <section className="admin-dashboard__stats">
        <article className="admin-dashboard__stat-card">
          <p className="admin-dashboard__stat-label">Брони сегодня</p>
          <p className="admin-dashboard__stat-value">{dashboard.todayBookingsCount}</p>
        </article>
        <Link href="/admin/bookings?status=pending_payment" className="admin-dashboard__stat-card admin-dashboard__stat-card--link">
          <p className="admin-dashboard__stat-label">Ожидают оплаты</p>
          <p className="admin-dashboard__stat-value">{dashboard.pendingPaymentsCount}</p>
        </Link>
        <article className="admin-dashboard__stat-card">
          <p className="admin-dashboard__stat-label">Активные корты / тренеры</p>
          <p className="admin-dashboard__stat-value">
            {dashboard.activeCourtsCount} / {dashboard.activeInstructorsCount}
          </p>
        </article>
        {canSeeRevenue ? (
          <article className="admin-dashboard__stat-card">
            <p className="admin-dashboard__stat-label">Выручка за неделю</p>
            <p className="admin-dashboard__stat-value">
              {dashboard.weekRevenueKzt.toLocaleString("ru-KZ")} ₸
            </p>
          </article>
        ) : null}
      </section>

      <section className="admin-dashboard__row">
        <div className="admin-dashboard__panel">
          <h2 className="admin-dashboard__panel-title">Быстрые действия</h2>
          <div className="admin-dashboard__quick-links">
            <Link href="/admin/bookings/create" className="admin-link-grid__item admin-link-grid__item--primary">
              Создать бронирование
            </Link>
            <Link href="/admin/bookings?status=pending_payment" className="admin-link-grid__item">
              Ожидают оплаты
            </Link>
            <Link href="/admin/exceptions" className="admin-link-grid__item">
              Добавить исключение
            </Link>
            {canSeeRevenue ? (
              <Link href="/admin/pricing/base" className="admin-link-grid__item">
                Цены
              </Link>
            ) : null}
          </div>
        </div>

        <div className="admin-dashboard__panel">
          <h2 className="admin-dashboard__panel-title">Оповещения</h2>
          {dashboard.alerts.length === 0 ? (
            <p className="admin-dashboard__empty">Критичных оповещений нет.</p>
          ) : (
            <ul className="admin-dashboard__alerts">
              {dashboard.alerts.map((alert) => (
                <li key={alert} className="admin-dashboard__alert">
                  {alert}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="admin-dashboard__panel">
        <h2 className="admin-dashboard__panel-title">Последние бронирования</h2>
        {dashboard.recentBookings.length === 0 ? (
          <p className="admin-dashboard__empty">Данных пока нет.</p>
        ) : (
          <div className="admin-dashboard__recent-list">
            {dashboard.recentBookings.map((row) => (
              <Link key={row.id} href={`/admin/bookings?bookingId=${row.id}`} className="admin-dashboard__recent-item admin-dashboard__recent-item--link">
                <div>
                  <p className="admin-dashboard__recent-title">{row.serviceName}</p>
                  <p className="admin-dashboard__recent-sub">
                    {row.customerName} · {row.dateTimeText}
                  </p>
                </div>
                <span className="admin-bookings__chip">{row.statusLabel}</span>
              </Link>
            ))}
          </div>
        )}
      </section>

    </AdminPageShell>
  );
}
