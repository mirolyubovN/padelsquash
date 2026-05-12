import Link from "next/link";
import { revalidatePath } from "next/cache";
import { AdminPageShell } from "@/src/components/admin/admin-page-shell";
import { AdminEditModal } from "@/src/components/admin/admin-edit-modal";
import { AdminConfirmActionForm } from "@/src/components/admin/admin-confirm-action-form";
import { assertAdmin } from "@/src/lib/auth/guards";
import {
	archivePromoCode,
	createPromoCode,
	listPromoCodes,
	updatePromoCode,
} from "@/src/lib/admin/promo-codes";
import { buildPageMetadata } from "@/src/lib/seo/metadata";
import { formatMoneyKzt } from "@/src/lib/format/money";
import { t } from "@/src/lib/i18n";

export const metadata = buildPageMetadata({
	title: "Админ: промокоды | Racket Community Kst",
	description: "Создание и управление скидочными промокодами.",
	path: "/admin/promo-codes",
	noIndex: true,
});

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, string> = {
	active: t("admin.promoCodes.status.active"),
	paused: t("admin.promoCodes.status.paused"),
	archived: t("admin.promoCodes.status.archived"),
};

function discountSummary(discountType: string, discountValue: number, maxDiscountKzt: number | null): string {
	if (discountType === "percent") {
		return maxDiscountKzt
			? t("admin.promoCodes.discount.percentWithMax", { value: discountValue, amount: formatMoneyKzt(maxDiscountKzt) })
			: `${discountValue}%`;
	}
	return formatMoneyKzt(discountValue);
}

function validityLabel(validFrom: string | null, validUntil: string | null): string {
	if (!validFrom && !validUntil) return t("admin.promoCodes.validity.unlimited");
	if (validFrom && !validUntil) return t("admin.promoCodes.validity.from", { date: validFrom });
	if (!validFrom && validUntil) return t("admin.promoCodes.validity.until", { date: validUntil });
	return t("admin.promoCodes.validity.range", { from: validFrom ?? "", until: validUntil ?? "" });
}

function usageLabel(redemptionCount: number, totalRedemptionLimit: number | null): string {
	if (totalRedemptionLimit === null) return t("admin.promoCodes.usage.times", { count: redemptionCount });
	return `${redemptionCount} / ${totalRedemptionLimit}`;
}

export default async function AdminPromoCodesPage() {
	await assertAdmin();
	const { promoCodes } = await listPromoCodes();

	async function createAction(formData: FormData) {
		"use server";
		await createPromoCode({
			code: String(formData.get("code") ?? ""),
			description: String(formData.get("description") ?? "") || null,
			discountType: String(formData.get("discountType") ?? "") as "percent" | "fixed_kzt",
			discountValue: Number(formData.get("discountValue") ?? 0),
			maxDiscountKzt: formData.get("maxDiscountKzt") ? Number(formData.get("maxDiscountKzt")) : null,
			minOrderKzt: formData.get("minOrderKzt") ? Number(formData.get("minOrderKzt")) : null,
			validFrom: String(formData.get("validFrom") ?? "") || null,
			validUntil: String(formData.get("validUntil") ?? "") || null,
			totalRedemptionLimit: formData.get("totalRedemptionLimit") ? Number(formData.get("totalRedemptionLimit")) : null,
			perCustomerLimit: formData.get("perCustomerLimit") ? Number(formData.get("perCustomerLimit")) : 1,
			appliesToServiceCodes: [],
			appliesToSportIds: [],
			firstBookingOnly: formData.get("firstBookingOnly") === "on",
			status: formData.get("status") === "paused" ? "paused" : "active",
		});
		revalidatePath("/admin/promo-codes");
	}

	async function updateAction(formData: FormData) {
		"use server";
		await updatePromoCode({
			id: String(formData.get("id") ?? ""),
			code: String(formData.get("code") ?? ""),
			description: String(formData.get("description") ?? "") || null,
			discountType: String(formData.get("discountType") ?? "") as "percent" | "fixed_kzt",
			discountValue: Number(formData.get("discountValue") ?? 0),
			maxDiscountKzt: formData.get("maxDiscountKzt") ? Number(formData.get("maxDiscountKzt")) : null,
			minOrderKzt: formData.get("minOrderKzt") ? Number(formData.get("minOrderKzt")) : null,
			validFrom: String(formData.get("validFrom") ?? "") || null,
			validUntil: String(formData.get("validUntil") ?? "") || null,
			totalRedemptionLimit: formData.get("totalRedemptionLimit") ? Number(formData.get("totalRedemptionLimit")) : null,
			perCustomerLimit: formData.get("perCustomerLimit") ? Number(formData.get("perCustomerLimit")) : 1,
			appliesToServiceCodes: [],
			appliesToSportIds: [],
			firstBookingOnly: formData.get("firstBookingOnly") === "on",
			status: formData.get("status") === "paused" ? "paused" : "active",
		});
		revalidatePath("/admin/promo-codes");
	}

	async function archiveAction(formData: FormData) {
		"use server";
		const id = String(formData.get("id") ?? "");
		await archivePromoCode(id);
		revalidatePath("/admin/promo-codes");
	}

	return (
		<AdminPageShell title={t("admin.promoCodes.list.title")} description={t("admin.promoCodes.list.description")}>
			<section className="admin-section">
				<div className="admin-section__head">
					<h2 className="admin-section__title">{t("admin.promoCodes.newTitle")}</h2>
				</div>
				<AdminEditModal triggerLabel={t("admin.promoCodes.createTrigger")} title={t("admin.promoCodes.newTitle")}>
					<form action={createAction} className="admin-form">
						<PromoCodeFormFields idPrefix="create" />
						<div className="admin-form__actions">
							<button type="submit" className="admin-form__submit">{t("admin.promoCodes.createSubmit")}</button>
						</div>
					</form>
				</AdminEditModal>
			</section>

			<div className="admin-table">
				<table className="admin-table__table">
					<thead>
						<tr className="admin-table__row">
							<th className="admin-table__cell admin-table__cell--head">{t("admin.promoCodes.table.code")}</th>
							<th className="admin-table__cell admin-table__cell--head">{t("admin.promoCodes.table.discount")}</th>
							<th className="admin-table__cell admin-table__cell--head">{t("admin.promoCodes.table.validity")}</th>
							<th className="admin-table__cell admin-table__cell--head">{t("admin.promoCodes.table.used")}</th>
							<th className="admin-table__cell admin-table__cell--head">{t("admin.promoCodes.table.status")}</th>
							<th className="admin-table__cell admin-table__cell--head">{t("admin.promoCodes.table.actions")}</th>
						</tr>
					</thead>
					<tbody>
						{promoCodes.length === 0 ? (
							<tr className="admin-table__row">
								<td className="admin-table__cell" colSpan={6}>{t("admin.promoCodes.empty")}</td>
							</tr>
						) : (
							promoCodes.map((promo) => (
								<tr key={promo.id} className="admin-table__row">
									<td className="admin-table__cell">
										<Link href={`/admin/promo-codes/${promo.id}`} className="admin-bookings__cell-title">
											{promo.code}
										</Link>
										{promo.description ? (
											<div className="admin-bookings__cell-sub">{promo.description}</div>
										) : null}
									</td>
									<td className="admin-table__cell">
										{discountSummary(promo.discountType, promo.discountValue, promo.maxDiscountKzt)}
									</td>
									<td className="admin-table__cell admin-bookings__cell-sub">
										{validityLabel(promo.validFrom, promo.validUntil)}
									</td>
									<td className="admin-table__cell">
										{usageLabel(promo.redemptionCount, promo.totalRedemptionLimit)}
									</td>
									<td className="admin-table__cell">
										<span className={`admin-status-badge ${promo.status === "active" ? "admin-status-badge--active" : "admin-status-badge--inactive"}`}>
											<span className="admin-status-badge__dot" aria-hidden="true" />
											{STATUS_LABELS[promo.status] ?? promo.status}
										</span>
									</td>
									<td className="admin-table__cell">
										<div className="admin-bookings__actions">
											{promo.status !== "archived" ? (
												<AdminEditModal triggerLabel={t("admin.promoCodes.editTrigger")} title={t("admin.promoCodes.editTitle", { code: promo.code })}>
													<form action={updateAction} className="admin-form">
														<input type="hidden" name="id" value={promo.id} />
														<PromoCodeFormFields idPrefix={`edit-${promo.id}`} defaults={promo} />
														<div className="admin-form__actions">
															<button type="submit" className="admin-form__submit">{t("admin.common.save")}</button>
														</div>
													</form>
												</AdminEditModal>
											) : null}
											{promo.status !== "archived" ? (
												<AdminConfirmActionForm
													action={archiveAction}
													hiddenFields={{ id: promo.id }}
													triggerLabel={t("admin.promoCodes.archiveTrigger")}
													title={t("admin.promoCodes.archiveTitle")}
													description={t("admin.promoCodes.archiveDescription", { code: promo.code })}
													confirmLabel={t("admin.promoCodes.archiveConfirm")}
													triggerClassName="admin-bookings__action-button admin-bookings__action-button--danger"
												/>
											) : null}
										</div>
									</td>
								</tr>
							))
						)}
					</tbody>
				</table>
			</div>
		</AdminPageShell>
	);
}

interface PromoCodeFormFieldsProps {
	idPrefix: string;
	defaults?: {
		code?: string;
		description?: string | null;
		discountType?: string;
		discountValue?: number;
		maxDiscountKzt?: number | null;
		minOrderKzt?: number | null;
		validFrom?: string | null;
		validUntil?: string | null;
		totalRedemptionLimit?: number | null;
		perCustomerLimit?: number | null;
		firstBookingOnly?: boolean;
		status?: string;
	};
}

function PromoCodeFormFields({ idPrefix, defaults }: PromoCodeFormFieldsProps) {
	return (
		<div className="admin-form__panel-grid">
			<div className="admin-form__group">
				<label className="admin-form__label" htmlFor={`${idPrefix}-code`}>{t("admin.promoCodes.fields.code")}</label>
				<input
					id={`${idPrefix}-code`}
					name="code"
					className="admin-form__field"
					placeholder="WELCOME10"
					defaultValue={defaults?.code ?? ""}
					required
				/>
			</div>
			<div className="admin-form__group">
				<label className="admin-form__label" htmlFor={`${idPrefix}-description`}>{t("admin.promoCodes.fields.description")}</label>
				<input
					id={`${idPrefix}-description`}
					name="description"
					className="admin-form__field"
					placeholder={t("admin.promoCodes.fields.descriptionPlaceholder")}
					defaultValue={defaults?.description ?? ""}
				/>
			</div>
			<div className="admin-form__group">
				<label className="admin-form__label" htmlFor={`${idPrefix}-discountType`}>{t("admin.promoCodes.fields.discountType")}</label>
				<select
					id={`${idPrefix}-discountType`}
					name="discountType"
					className="admin-form__field"
					defaultValue={defaults?.discountType ?? "percent"}
				>
					<option value="percent">{t("admin.promoCodes.discountType.percentWithSymbol")}</option>
					<option value="fixed_kzt">{t("admin.promoCodes.discountType.fixedKztWithSymbol")}</option>
				</select>
			</div>
			<div className="admin-form__group">
				<label className="admin-form__label" htmlFor={`${idPrefix}-discountValue`}>{t("admin.promoCodes.fields.discountValue")}</label>
				<input
					id={`${idPrefix}-discountValue`}
					name="discountValue"
					type="number"
					min="0.01"
					step="0.01"
					className="admin-form__field"
					defaultValue={defaults?.discountValue ?? 10}
					required
				/>
			</div>
			<div className="admin-form__group">
				<label className="admin-form__label" htmlFor={`${idPrefix}-maxDiscountKzt`}>{t("admin.promoCodes.fields.maxDiscountKztPercent")}</label>
				<input
					id={`${idPrefix}-maxDiscountKzt`}
					name="maxDiscountKzt"
					type="number"
					min="0"
					className="admin-form__field"
					defaultValue={defaults?.maxDiscountKzt ?? ""}
					placeholder={t("admin.promoCodes.validity.unlimited")}
				/>
			</div>
			<div className="admin-form__group">
				<label className="admin-form__label" htmlFor={`${idPrefix}-minOrderKzt`}>{t("admin.promoCodes.fields.minOrderKzt")}</label>
				<input
					id={`${idPrefix}-minOrderKzt`}
					name="minOrderKzt"
					type="number"
					min="0"
					className="admin-form__field"
					defaultValue={defaults?.minOrderKzt ?? ""}
					placeholder={t("admin.promoCodes.validity.unlimited")}
				/>
			</div>
			<div className="admin-form__group">
				<label className="admin-form__label" htmlFor={`${idPrefix}-validFrom`}>{t("admin.promoCodes.fields.validFrom")}</label>
				<input
					id={`${idPrefix}-validFrom`}
					name="validFrom"
					type="date" lang="ru-RU"
					className="admin-form__field"
					defaultValue={defaults?.validFrom ?? ""}
				/>
			</div>
			<div className="admin-form__group">
				<label className="admin-form__label" htmlFor={`${idPrefix}-validUntil`}>{t("admin.promoCodes.fields.validUntil")}</label>
				<input
					id={`${idPrefix}-validUntil`}
					name="validUntil"
					type="date" lang="ru-RU"
					className="admin-form__field"
					defaultValue={defaults?.validUntil ?? ""}
				/>
			</div>
			<div className="admin-form__group">
				<label className="admin-form__label" htmlFor={`${idPrefix}-totalRedemptionLimit`}>{t("admin.promoCodes.fields.totalRedemptionLimit")}</label>
				<input
					id={`${idPrefix}-totalRedemptionLimit`}
					name="totalRedemptionLimit"
					type="number"
					min="0"
					className="admin-form__field"
					defaultValue={defaults?.totalRedemptionLimit ?? ""}
					placeholder={t("admin.promoCodes.validity.unlimited")}
				/>
			</div>
			<div className="admin-form__group">
				<label className="admin-form__label" htmlFor={`${idPrefix}-perCustomerLimit`}>{t("admin.promoCodes.fields.perCustomerLimit")}</label>
				<input
					id={`${idPrefix}-perCustomerLimit`}
					name="perCustomerLimit"
					type="number"
					min="0"
					className="admin-form__field"
					defaultValue={defaults?.perCustomerLimit ?? 1}
				/>
			</div>
			<div className="admin-form__group">
				<label className="admin-form__label" htmlFor={`${idPrefix}-status`}>{t("admin.promoCodes.fields.status")}</label>
				<select
					id={`${idPrefix}-status`}
					name="status"
					className="admin-form__field"
					defaultValue={defaults?.status ?? "active"}
				>
					<option value="active">{t("admin.promoCodes.status.active")}</option>
					<option value="paused">{t("admin.promoCodes.status.paused")}</option>
				</select>
			</div>
			<div className="admin-form__group">
				<label className="admin-form__checkbox">
					<input
						name="firstBookingOnly"
						type="checkbox"
						defaultChecked={defaults?.firstBookingOnly ?? false}
					/>
					<span>{t("admin.promoCodes.fields.firstBookingOnly")}</span>
				</label>
			</div>
		</div>
	);
}
