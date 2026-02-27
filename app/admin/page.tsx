import Link from "next/link";
import { AdminPageShell } from "@/src/components/admin/admin-page-shell";
import { getAdminDashboardData } from "@/src/lib/admin/dashboard";
import { assertAdmin } from "@/src/lib/auth/guards";
import { adminNavItems } from "@/src/components/admin/admin-nav-config";
import { buildPageMetadata } from "@/src/lib/seo/metadata";

export const metadata = buildPageMetadata({
  title: "Админ-панель | Padel & Squash KZ",
  description: "Главная страница админ-панели со сводной статистикой, оповещениями и быстрыми действиями для управления клубом.",
  path: "/admin",
  noIndex: true,
});

export default async function AdminIndexPage() {
  await assertAdmin();
  const dashboard = await getAdminDashboardData();
  const adminSections = [
    ...adminNavItems.filter((item) => item.href !== "/admin"),
    { href: "/admin/pricing/rules", label: "Периоды цен" },
  ];
  return (
    <AdminPageShell
      title="Панель управления"
      description="Сводка по бронированиям и быстрый доступ к ключевым разделам управления клубом."
    >
      <section className="admin-dashboard__stats">
        <article className="admin-dashboard__stat-card">
          <p className="admin-dashboard__stat-label">Брони сегодня</p>
          <p className="admin-dashboard__stat-value">{dashboard.todayBookingsCount}</p>
        </article>
        <article className="admin-dashboard__stat-card">
          <p className="admin-dashboard__stat-label">Ожидают оплаты</p>
          <p className="admin-dashboard__stat-value">{dashboard.pendingPaymentsCount}</p>
        </article>
        <article className="admin-dashboard__stat-card">
          <p className="admin-dashboard__stat-label">Активные корты / тренеры</p>
          <p className="admin-dashboard__stat-value">
            {dashboard.activeCourtsCount} / {dashboard.activeInstructorsCount}
          </p>
        </article>
        <article className="admin-dashboard__stat-card">
          <p className="admin-dashboard__stat-label">Выручка за неделю</p>
          <p className="admin-dashboard__stat-value">
            {dashboard.weekRevenueKzt.toLocaleString("ru-KZ")} ₸
          </p>
        </article>
      </section>

      <section className="admin-dashboard__row">
        <div className="admin-dashboard__panel">
          <h2 className="admin-dashboard__panel-title">Быстрые действия</h2>
          <div className="admin-dashboard__quick-links">
            <Link href="/admin/bookings?status=pending_payment" className="admin-link-grid__item">
              Открыть ожидающие оплаты
            </Link>
            <Link href="/admin/instructors" className="admin-link-grid__item">
              Проверить тренеров и график
            </Link>
            <Link href="/admin/exceptions" className="admin-link-grid__item">
              Добавить исключение
            </Link>
            <Link href="/admin/pricing/base" className="admin-link-grid__item">
              Обновить матрицу цен
            </Link>
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
              <div key={row.id} className="admin-dashboard__recent-item">
                <div>
                  <p className="admin-dashboard__recent-title">{row.serviceName}</p>
                  <p className="admin-dashboard__recent-sub">
                    {row.customerName} · {row.dateTimeText}
                  </p>
                </div>
                <span className="admin-bookings__chip">{row.statusLabel}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="admin-link-grid">
        {adminSections.map((section) => (
          <Link key={section.href} href={section.href} className="admin-link-grid__item">
            {section.label}
          </Link>
        ))}
      </div>
    </AdminPageShell>
  );
}
