import Link from "next/link";
import { AdminPageShell } from "@/src/components/admin/admin-page-shell";
import { assertAdmin } from "@/src/lib/auth/guards";
import { prisma } from "@/src/lib/prisma";
import { buildPageMetadata } from "@/src/lib/seo/metadata";
import { t } from "@/src/lib/i18n";

export const metadata = buildPageMetadata({
	title: "Журнал действий | Racket Community Kst",
	description: "Аудит-лог административных действий: отмены, изменения статусов, удаления ресурсов и корректировки кошелька.",
	path: "/admin/audit",
	noIndex: true,
});

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

const ACTION_LABELS: Record<string, string> = {
	"booking.cancel": t("admin.audit.actions.bookingCancel"),
	"booking.status_change": t("admin.audit.actions.bookingStatusChange"),
	"booking.payment_change": t("admin.audit.actions.bookingPaymentChange"),
	"event.register": t("admin.audit.actions.eventRegister"),
	"event.cancel_registration": t("admin.audit.actions.eventCancelRegistration"),
	"event.cancel": t("admin.audit.actions.eventCancel"),
	"event.status_change": t("admin.audit.actions.eventStatusChange"),
	"court.create": t("admin.audit.actions.courtCreate"),
	"court.update": t("admin.audit.actions.courtUpdate"),
	"court.delete": t("admin.audit.actions.courtDelete"),
	"court.toggle_active": t("admin.audit.actions.courtToggleActive"),
	"instructor.create": t("admin.audit.actions.instructorCreate"),
	"instructor.update": t("admin.audit.actions.instructorUpdate"),
	"instructor.delete": t("admin.audit.actions.instructorDelete"),
	"instructor.toggle_active": t("admin.audit.actions.instructorToggleActive"),
	"sport.create": t("admin.audit.actions.sportCreate"),
	"sport.update": t("admin.audit.actions.sportUpdate"),
	"sport.delete": t("admin.audit.actions.sportDelete"),
	"wallet.admin_credit": t("admin.audit.actions.walletAdminCredit"),
	"wallet.admin_debit": t("admin.audit.actions.walletAdminDebit"),
};

const ENTITY_LABELS: Record<string, string> = {
	booking: t("admin.audit.entities.booking"),
	event: t("admin.audit.entities.event"),
	event_registration: t("admin.audit.entities.eventRegistration"),
	court: t("admin.audit.entities.court"),
	instructor: t("admin.audit.entities.instructor"),
	sport: t("admin.audit.entities.sport"),
	wallet: t("admin.audit.entities.wallet"),
};

export default async function AdminAuditPage({
	searchParams,
}: {
	searchParams: Promise<{
		entityType?: string;
		action?: string;
		dateFrom?: string;
		dateTo?: string;
		page?: string;
	}>;
}) {
	await assertAdmin();
	const params = await searchParams;

	const page = Math.max(1, Number(params.page ?? "1") || 1);
	const entityType = params.entityType?.trim() || undefined;
	const action = params.action?.trim() || undefined;
	const dateFrom = params.dateFrom || undefined;
	const dateTo = params.dateTo || undefined;

	const where = {
		...(entityType ? { entityType } : {}),
		...(action ? { action } : {}),
		...(dateFrom || dateTo
			? {
				createdAt: {
					...(dateFrom ? { gte: new Date(dateFrom) } : {}),
					...(dateTo ? { lte: new Date(dateTo + "T23:59:59Z") } : {}),
				},
			}
			: {}),
	};

	const [rows, total] = await Promise.all([
		prisma.auditLog.findMany({
			where,
			orderBy: { createdAt: "desc" },
			skip: (page - 1) * PAGE_SIZE,
			take: PAGE_SIZE,
		}),
		prisma.auditLog.count({ where }),
	]);

	const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

	function buildUrl(overrides: Record<string, string | number | undefined>) {
		const p = new URLSearchParams();
		const merged = { entityType, action, dateFrom, dateTo, page, ...overrides };
		if (merged.entityType) p.set("entityType", merged.entityType as string);
		if (merged.action) p.set("action", merged.action as string);
		if (merged.dateFrom) p.set("dateFrom", merged.dateFrom as string);
		if (merged.dateTo) p.set("dateTo", merged.dateTo as string);
		if (merged.page && Number(merged.page) > 1) p.set("page", String(merged.page));
		const qs = p.toString();
		return qs ? `/admin/audit?${qs}` : "/admin/audit";
	}

	return (
		<AdminPageShell
			title={t("admin.audit.title")}
			description={t("admin.audit.description")}
		>
			<form method="get" className="admin-filters">
				<div className="admin-filters__grid">
					<div className="admin-form__group">
						<label htmlFor="audit-entity" className="admin-form__label">{t("admin.audit.filters.entityType")}</label>
						<select id="audit-entity" name="entityType" className="admin-form__field" defaultValue={entityType ?? ""}>
							<option value="">{t("admin.common.all")}</option>
							{Object.entries(ENTITY_LABELS).map(([value, label]) => (
								<option key={value} value={value}>{label}</option>
							))}
						</select>
					</div>
					<div className="admin-form__group">
						<label htmlFor="audit-action" className="admin-form__label">{t("admin.audit.filters.action")}</label>
						<select id="audit-action" name="action" className="admin-form__field" defaultValue={action ?? ""}>
							<option value="">{t("admin.common.all")}</option>
							{Object.entries(ACTION_LABELS).map(([value, label]) => (
								<option key={value} value={value}>{label}</option>
							))}
						</select>
					</div>
					<div className="admin-form__group">
						<label htmlFor="audit-date-from" className="admin-form__label">{t("admin.audit.filters.dateFrom")}</label>
						<input id="audit-date-from" name="dateFrom" type="date" lang="ru-RU" className="admin-form__field" defaultValue={dateFrom ?? ""} />
					</div>
					<div className="admin-form__group">
						<label htmlFor="audit-date-to" className="admin-form__label">{t("admin.audit.filters.dateTo")}</label>
						<input id="audit-date-to" name="dateTo" type="date" lang="ru-RU" className="admin-form__field" defaultValue={dateTo ?? ""} />
					</div>
				</div>
				<div className="admin-filters__actions">
					<button type="submit" className="admin-form__submit">{t("admin.common.apply")}</button>
					<Link href="/admin/audit" className="admin-bookings__action-button">{t("admin.common.reset")}</Link>
				</div>
			</form>

			<div className="admin-list-toolbar">
				<p className="admin-list-toolbar__meta">{t("admin.audit.resultsMeta", { total, page, totalPages })}</p>
			</div>

			<div className="admin-table">
				<table className="admin-table__table">
					<thead>
						<tr className="admin-table__row">
							<th className="admin-table__cell admin-table__cell--head">{t("admin.audit.table.when")}</th>
							<th className="admin-table__cell admin-table__cell--head">{t("admin.audit.table.action")}</th>
							<th className="admin-table__cell admin-table__cell--head">{t("admin.audit.table.entity")}</th>
							<th className="admin-table__cell admin-table__cell--head">{t("admin.audit.table.entityId")}</th>
							<th className="admin-table__cell admin-table__cell--head">{t("admin.audit.table.details")}</th>
						</tr>
					</thead>
					<tbody>
						{rows.length === 0 ? (
							<tr className="admin-table__row">
								<td className="admin-table__cell" colSpan={5}>{t("admin.audit.empty")}</td>
							</tr>
						) : (
							rows.map((row) => {
								const createdAt = new Date(row.createdAt);
								const dateStr = createdAt.toLocaleDateString("ru-KZ", {
									timeZone: "Asia/Almaty",
									day: "2-digit",
									month: "2-digit",
									year: "numeric",
								});
								const timeStr = createdAt.toLocaleTimeString("ru-KZ", {
									timeZone: "Asia/Almaty",
									hour: "2-digit",
									minute: "2-digit",
									hour12: false,
								});
								const detailStr = row.detail ? JSON.stringify(row.detail, null, 0) : "—";

								return (
									<tr key={row.id} className="admin-table__row">
										<td className="admin-table__cell">
											<div className="admin-bookings__cell-title">{dateStr}</div>
											<div className="admin-bookings__cell-sub">{timeStr}</div>
										</td>
										<td className="admin-table__cell">
											<div className="admin-bookings__cell-title">
												{ACTION_LABELS[row.action] ?? row.action}
											</div>
										</td>
										<td className="admin-table__cell">
											{ENTITY_LABELS[row.entityType] ?? row.entityType}
										</td>
										<td className="admin-table__cell">
											<div className="admin-bookings__cell-sub" style={{ fontFamily: "monospace", fontSize: "0.7rem" }}>
												{row.entityId}
											</div>
										</td>
										<td className="admin-table__cell">
											<div className="admin-bookings__cell-sub" style={{ fontFamily: "monospace", fontSize: "0.7rem", whiteSpace: "pre-wrap", maxWidth: "20rem" }}>
												{detailStr}
											</div>
										</td>
									</tr>
								);
							})
						)}
					</tbody>
				</table>
			</div>

			<div className="admin-pagination">
				<Link
					href={buildUrl({ page: Math.max(1, page - 1) })}
					className={`admin-pagination__link${page <= 1 ? " admin-pagination__link--disabled" : ""}`}
					aria-disabled={page <= 1}
				>
					{t("admin.pagination.back")}
				</Link>
				<span className="admin-pagination__meta">{t("admin.pagination.pageOf", { page, totalPages })}</span>
				<Link
					href={buildUrl({ page: Math.min(totalPages, page + 1) })}
					className={`admin-pagination__link${page >= totalPages ? " admin-pagination__link--disabled" : ""}`}
					aria-disabled={page >= totalPages}
				>
					{t("admin.pagination.forward")}
				</Link>
			</div>
		</AdminPageShell>
	);
}
