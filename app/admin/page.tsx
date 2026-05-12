import Link from "next/link";
import { AdminPageShell } from "@/src/components/admin/admin-page-shell";
import { getAdminDashboardData } from "@/src/lib/admin/dashboard";
import { assertAdmin } from "@/src/lib/auth/guards";
import { canViewRevenue } from "@/src/lib/auth/roles";
import { t } from "@/src/lib/i18n";
import { buildPageMetadata } from "@/src/lib/seo/metadata";

export const metadata = buildPageMetadata({
	title: "Админ-панель | Racket Community Kst",
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
			title={t("admin.dashboard.title")}
			description={t("admin.dashboard.description")}
		>
			<section className="admin-dashboard__stats">
				<article className="admin-dashboard__stat-card">
					<p className="admin-dashboard__stat-label">{t("admin.dashboard.stats.todayBookings")}</p>
					<p className="admin-dashboard__stat-value">{dashboard.todayBookingsCount}</p>
				</article>
				<Link href="/admin/bookings?status=pending_payment" className="admin-dashboard__stat-card admin-dashboard__stat-card--link">
					<p className="admin-dashboard__stat-label">{t("admin.dashboard.stats.pendingPayments")}</p>
					<p className="admin-dashboard__stat-value">{dashboard.pendingPaymentsCount}</p>
				</Link>
				<article className="admin-dashboard__stat-card">
					<p className="admin-dashboard__stat-label">{t("admin.dashboard.stats.activeCourtsInstructors")}</p>
					<p className="admin-dashboard__stat-value">
						{dashboard.activeCourtsCount} / {dashboard.activeInstructorsCount}
					</p>
				</article>
				{canSeeRevenue ? (
					<article className="admin-dashboard__stat-card">
						<p className="admin-dashboard__stat-label">Выручка недели</p>
						<p className="admin-dashboard__stat-value">
							{dashboard.weekRevenueKzt.toLocaleString("ru-KZ")} ₸
						</p>
					</article>
				) : null}
			</section>

			{canSeeRevenue ? (
				<section className="admin-dashboard__stats">
					<article className="admin-dashboard__stat-card">
						<p className="admin-dashboard__stat-label">Клубу за неделю</p>
						<p className="admin-dashboard__stat-value">
							{dashboard.weekClubRevenueKzt.toLocaleString("ru-KZ")} ₸
						</p>
					</article>
					<article className="admin-dashboard__stat-card">
						<p className="admin-dashboard__stat-label">Тренерам за неделю</p>
						<p className="admin-dashboard__stat-value">
							{dashboard.weekTrainerPayoutKzt.toLocaleString("ru-KZ")} ₸
						</p>
					</article>
				</section>
			) : null}

			<section className="admin-dashboard__row">
				<div className="admin-dashboard__panel">
					<h2 className="admin-dashboard__panel-title">{t("admin.dashboard.quickActions.title")}</h2>
					<div className="admin-dashboard__quick-links">
						<Link href="/admin/bookings/create" className="admin-link-grid__item admin-link-grid__item--primary">
							{t("admin.dashboard.quickActions.createBooking")}
						</Link>
						<Link href="/admin/bookings?status=pending_payment" className="admin-link-grid__item">
							{t("admin.dashboard.quickActions.pendingPayments")}
						</Link>
						{canSeeRevenue ? (
							<>
								<Link href="/admin/exceptions" className="admin-link-grid__item">
									{t("admin.dashboard.quickActions.addException")}
								</Link>
								<Link href="/admin/pricing/base" className="admin-link-grid__item">
									{t("admin.dashboard.quickActions.prices")}
								</Link>
							</>
						) : null}
					</div>
				</div>

				<div className="admin-dashboard__panel">
					<h2 className="admin-dashboard__panel-title">{t("admin.dashboard.alerts.title")}</h2>
					{dashboard.alerts.length === 0 ? (
						<p className="admin-dashboard__empty">{t("admin.dashboard.alerts.empty")}</p>
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
				<h2 className="admin-dashboard__panel-title">{t("admin.dashboard.recentBookings.title")}</h2>
				{dashboard.recentBookings.length === 0 ? (
					<p className="admin-dashboard__empty">{t("admin.common.noDataYet")}</p>
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
