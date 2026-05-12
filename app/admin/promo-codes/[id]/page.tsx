import Link from "next/link";
import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { AdminPageShell } from "@/src/components/admin/admin-page-shell";
import { AdminEditModal } from "@/src/components/admin/admin-edit-modal";
import { AdminConfirmActionForm } from "@/src/components/admin/admin-confirm-action-form";
import { assertAdmin } from "@/src/lib/auth/guards";
import {
	archivePromoCode,
	getPromoCodeById,
	updatePromoCode,
} from "@/src/lib/admin/promo-codes";
import { formatMoneyKzt } from "@/src/lib/format/money";
import { buildPageMetadata } from "@/src/lib/seo/metadata";
import { t } from "@/src/lib/i18n";

export const dynamic = "force-dynamic";

export function generateMetadata() {
	return buildPageMetadata({
		title: "Промокод | Racket Community Kst",
		description: "Детали и история использования промокода.",
		path: "/admin/promo-codes",
		noIndex: true,
	});
}

const STATUS_LABELS: Record<string, string> = {
	active: t("admin.promoCodes.status.active"),
	paused: t("admin.promoCodes.status.paused"),
	archived: t("admin.promoCodes.status.archivedDetailed"),
};

const DISCOUNT_TYPE_LABELS: Record<string, string> = {
	percent: t("admin.promoCodes.discountType.percent"),
	fixed_kzt: t("admin.promoCodes.discountType.fixedKzt"),
};

export default async function AdminPromoCodeDetailPage({ params }: { params: Promise<{ id: string }> }) {
	await assertAdmin();
	const { id } = await params;
	const data = await getPromoCodeById(id);
	if (!data) notFound();

	const { promo, redemptions, totalDiscountKzt } = data;

	async function updateAction(formData: FormData) {
		"use server";
		await updatePromoCode({
			id,
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
		revalidatePath(`/admin/promo-codes/${id}`);
		revalidatePath("/admin/promo-codes");
	}

	async function archiveAction(formData: FormData) {
		"use server";
		const promoId = String(formData.get("id") ?? "");
		await archivePromoCode(promoId);
		revalidatePath(`/admin/promo-codes/${id}`);
		revalidatePath("/admin/promo-codes");
	}

	return (
		<AdminPageShell
			title={promo.code}
			description={`${DISCOUNT_TYPE_LABELS[promo.discountType] ?? promo.discountType} · ${STATUS_LABELS[promo.status] ?? promo.status}`}
		>
			<section className="admin-section">
				<div className="admin-section__head">
					<div className="admin-bookings__cell-title">
						<Link href="/admin/promo-codes" className="admin-bookings__cell-sub">{t("admin.promoCodes.backToList")}</Link>
					</div>
				</div>

				<div className="admin-form admin-form--panel">
					<div className="admin-form__panel-grid">
						<div className="admin-form__group">
							<div className="admin-form__label">{t("admin.promoCodes.detail.discount")}</div>
							<div>
								{promo.discountType === "percent"
									? promo.maxDiscountKzt
										? t("admin.promoCodes.discount.percentWithMax", { value: promo.discountValue, amount: formatMoneyKzt(promo.maxDiscountKzt) })
										: `${promo.discountValue}%`
									: formatMoneyKzt(promo.discountValue)}
							</div>
						</div>
						{promo.minOrderKzt !== null ? (
							<div className="admin-form__group">
								<div className="admin-form__label">{t("admin.promoCodes.detail.minAmount")}</div>
								<div>{formatMoneyKzt(promo.minOrderKzt)}</div>
							</div>
						) : null}
						<div className="admin-form__group">
							<div className="admin-form__label">{t("admin.promoCodes.detail.validity")}</div>
							<div>
								{promo.validFrom || promo.validUntil
									? t("admin.promoCodes.validity.untilRange", { from: promo.validFrom ?? "—", until: promo.validUntil ?? "—" })
									: t("admin.promoCodes.validity.unlimited")}
							</div>
						</div>
						<div className="admin-form__group">
							<div className="admin-form__label">{t("admin.promoCodes.detail.usedLimit")}</div>
							<div>
								{promo.redemptionCount}
								{promo.totalRedemptionLimit !== null ? ` / ${promo.totalRedemptionLimit}` : ""}
							</div>
						</div>
						<div className="admin-form__group">
							<div className="admin-form__label">{t("admin.promoCodes.detail.perCustomerLimit")}</div>
							<div>{promo.perCustomerLimit ?? "1"}</div>
						</div>
						<div className="admin-form__group">
							<div className="admin-form__label">{t("admin.promoCodes.detail.totalDiscountIssued")}</div>
							<div>{formatMoneyKzt(totalDiscountKzt)}</div>
						</div>
						{promo.firstBookingOnly ? (
							<div className="admin-form__group">
								<div className="admin-form__label">{t("admin.promoCodes.detail.restriction")}</div>
								<div>{t("admin.promoCodes.fields.firstBookingOnly")}</div>
							</div>
						) : null}
					</div>
				</div>

				{promo.status !== "archived" ? (
					<div className="admin-bookings__actions">
						<AdminEditModal triggerLabel={t("admin.promoCodes.editTrigger")} title={t("admin.promoCodes.editTitle", { code: promo.code })}>
							<form action={updateAction} className="admin-form">
								<div className="admin-form__panel-grid">
									<div className="admin-form__group">
										<label className="admin-form__label" htmlFor="detail-code">{t("admin.promoCodes.fields.code")}</label>
										<input id="detail-code" name="code" className="admin-form__field" defaultValue={promo.code} required />
									</div>
									<div className="admin-form__group">
										<label className="admin-form__label" htmlFor="detail-description">{t("admin.promoCodes.fields.description")}</label>
										<input id="detail-description" name="description" className="admin-form__field" defaultValue={promo.description ?? ""} />
									</div>
									<div className="admin-form__group">
										<label className="admin-form__label" htmlFor="detail-discountType">{t("admin.promoCodes.fields.discountType")}</label>
										<select id="detail-discountType" name="discountType" className="admin-form__field" defaultValue={promo.discountType}>
											<option value="percent">{t("admin.promoCodes.discountType.percentWithSymbol")}</option>
											<option value="fixed_kzt">{t("admin.promoCodes.discountType.fixedKztShortWithSymbol")}</option>
										</select>
									</div>
									<div className="admin-form__group">
										<label className="admin-form__label" htmlFor="detail-discountValue">{t("admin.promoCodes.fields.value")}</label>
										<input id="detail-discountValue" name="discountValue" type="number" min="0.01" step="0.01" className="admin-form__field" defaultValue={promo.discountValue} required />
									</div>
									<div className="admin-form__group">
										<label className="admin-form__label" htmlFor="detail-maxDiscountKzt">{t("admin.promoCodes.fields.maxDiscountKzt")}</label>
										<input id="detail-maxDiscountKzt" name="maxDiscountKzt" type="number" min="0" className="admin-form__field" defaultValue={promo.maxDiscountKzt ?? ""} placeholder={t("admin.promoCodes.validity.unlimited")} />
									</div>
									<div className="admin-form__group">
										<label className="admin-form__label" htmlFor="detail-minOrderKzt">{t("admin.promoCodes.fields.minAmountKzt")}</label>
										<input id="detail-minOrderKzt" name="minOrderKzt" type="number" min="0" className="admin-form__field" defaultValue={promo.minOrderKzt ?? ""} placeholder={t("admin.promoCodes.validity.unlimited")} />
									</div>
									<div className="admin-form__group">
										<label className="admin-form__label" htmlFor="detail-validFrom">{t("admin.promoCodes.fields.validFrom")}</label>
										<input id="detail-validFrom" name="validFrom" type="date" lang="ru-RU" className="admin-form__field" defaultValue={promo.validFrom ?? ""} />
									</div>
									<div className="admin-form__group">
										<label className="admin-form__label" htmlFor="detail-validUntil">{t("admin.promoCodes.fields.validUntil")}</label>
										<input id="detail-validUntil" name="validUntil" type="date" lang="ru-RU" className="admin-form__field" defaultValue={promo.validUntil ?? ""} />
									</div>
									<div className="admin-form__group">
										<label className="admin-form__label" htmlFor="detail-totalRedemptionLimit">{t("admin.promoCodes.fields.totalLimit")}</label>
										<input id="detail-totalRedemptionLimit" name="totalRedemptionLimit" type="number" min="0" className="admin-form__field" defaultValue={promo.totalRedemptionLimit ?? ""} placeholder={t("admin.promoCodes.validity.unlimited")} />
									</div>
									<div className="admin-form__group">
										<label className="admin-form__label" htmlFor="detail-perCustomerLimit">{t("admin.promoCodes.fields.perCustomerLimit")}</label>
										<input id="detail-perCustomerLimit" name="perCustomerLimit" type="number" min="0" className="admin-form__field" defaultValue={promo.perCustomerLimit ?? 1} />
									</div>
									<div className="admin-form__group">
										<label className="admin-form__label" htmlFor="detail-status">{t("admin.promoCodes.fields.status")}</label>
										<select id="detail-status" name="status" className="admin-form__field" defaultValue={promo.status}>
											<option value="active">{t("admin.promoCodes.status.active")}</option>
											<option value="paused">{t("admin.promoCodes.status.paused")}</option>
										</select>
									</div>
									<div className="admin-form__group">
										<label className="admin-form__checkbox">
											<input name="firstBookingOnly" type="checkbox" defaultChecked={promo.firstBookingOnly} />
											<span>{t("admin.promoCodes.fields.firstBookingOnly")}</span>
										</label>
									</div>
								</div>
								<div className="admin-form__actions">
									<button type="submit" className="admin-form__submit">{t("admin.common.save")}</button>
								</div>
							</form>
						</AdminEditModal>
						<AdminConfirmActionForm
							action={archiveAction}
							hiddenFields={{ id: promo.id }}
							triggerLabel={t("admin.promoCodes.archiveTrigger")}
							title={t("admin.promoCodes.archiveTitle")}
							description={t("admin.promoCodes.archiveDescription", { code: promo.code })}
							confirmLabel={t("admin.promoCodes.archiveConfirm")}
							triggerClassName="admin-bookings__action-button admin-bookings__action-button--danger"
						/>
					</div>
				) : null}
			</section>

			<section className="admin-section">
				<div className="admin-section__head">
					<h2 className="admin-section__title">{t("admin.promoCodes.redemptions.title")}</h2>
				</div>
				<div className="admin-table">
					<table className="admin-table__table">
						<thead>
							<tr className="admin-table__row">
								<th className="admin-table__cell admin-table__cell--head">{t("admin.promoCodes.redemptions.customer")}</th>
								<th className="admin-table__cell admin-table__cell--head">{t("admin.promoCodes.redemptions.booking")}</th>
								<th className="admin-table__cell admin-table__cell--head">{t("admin.promoCodes.redemptions.discount")}</th>
								<th className="admin-table__cell admin-table__cell--head">{t("admin.promoCodes.redemptions.date")}</th>
							</tr>
						</thead>
						<tbody>
							{redemptions.length === 0 ? (
								<tr className="admin-table__row">
									<td className="admin-table__cell" colSpan={4}>{t("admin.promoCodes.redemptions.empty")}</td>
								</tr>
							) : (
								redemptions.map((r) => (
									<tr key={r.id} className="admin-table__row">
										<td className="admin-table__cell">
											<Link href={`/admin/clients/${r.customerId}`} className="admin-bookings__cell-title">
												{r.customerName}
											</Link>
										</td>
										<td className="admin-table__cell">
											{r.bookingId ? (
												<Link href={`/admin/bookings?id=${r.bookingId}`} className="admin-bookings__cell-sub">
													{t("admin.promoCodes.redemptions.booking")}
												</Link>
											) : (
												<span className="admin-bookings__cell-sub">—</span>
											)}
										</td>
										<td className="admin-table__cell">{formatMoneyKzt(r.amountKzt)}</td>
										<td className="admin-table__cell admin-bookings__cell-sub">
											{new Date(r.createdAtIso).toLocaleDateString("ru-RU")}
										</td>
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
