import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { AdminPageShell } from "@/src/components/admin/admin-page-shell";
import { AdminConfirmActionForm } from "@/src/components/admin/admin-confirm-action-form";
import { AdminEditModal } from "@/src/components/admin/admin-edit-modal";
import { assertSuperAdmin } from "@/src/lib/auth/guards";
import {
	createSportFromForm,
	deleteSport,
	getAdminSports,
	setSportActive,
	updateSportFromForm,
} from "@/src/lib/admin/resources";
import { buildPageMetadata } from "@/src/lib/seo/metadata";
import { t } from "@/src/lib/i18n";

export const metadata = buildPageMetadata({
	title: "Админ: виды спорта | Racket Community Kst",
	description: "Центральная настройка вида спорта: название, rental service и базовые цены корта.",
	path: "/admin/sports",
	noIndex: true,
});

export const dynamic = "force-dynamic";

function revalidateSportDependencies() {
	revalidatePath("/admin/sports");
	revalidatePath("/admin/courts");
	revalidatePath("/admin/instructors");
	revalidatePath("/admin/services");
	revalidatePath("/admin/pricing/base");
	revalidatePath("/book");
	revalidatePath("/coaches");
	revalidatePath("/prices");
	revalidatePath("/");
}

export default async function AdminSportsPage({
	searchParams,
}: {
	searchParams: Promise<{ error?: string; success?: string }>;
}) {
	await assertSuperAdmin();
	const params = await searchParams;
	const sports = await getAdminSports();

	const errorMessage =
		params.error === "delete_blocked"
			? t("admin.sports.deleteBlocked")
			: params.error === "delete_failed"
				? t("admin.sports.deleteFailed")
				: null;
	const successMessage = params.success === "deleted" ? t("admin.sports.deleted") : null;

	async function createAction(formData: FormData) {
		"use server";
		await assertSuperAdmin();
		await createSportFromForm(formData);
		revalidateSportDependencies();
	}

	async function updateAction(formData: FormData) {
		"use server";
		await assertSuperAdmin();
		await updateSportFromForm(formData);
		revalidateSportDependencies();
	}

	async function toggleActiveAction(formData: FormData) {
		"use server";
		await assertSuperAdmin();

		const sportId = String(formData.get("sportId") ?? "");
		const nextActive = String(formData.get("nextActive") ?? "") === "true";
		if (!sportId) {
			throw new Error("sportId is required");
		}

		await setSportActive({ sportId, active: nextActive });
		revalidateSportDependencies();
	}

	async function deleteAction(formData: FormData) {
		"use server";
		await assertSuperAdmin();

		const sportId = String(formData.get("sportId") ?? "");
		if (!sportId) {
			throw new Error("sportId is required");
		}

		try {
			await deleteSport(sportId);
		} catch (error) {
			const message = error instanceof Error ? error.message : "";
			if (message.includes("already used") || message.includes("используется")) {
				redirect("/admin/sports?error=delete_blocked");
			}
			redirect("/admin/sports?error=delete_failed");
		}

		revalidateSportDependencies();
		redirect("/admin/sports?success=deleted");
	}

	return (
		<AdminPageShell
			title={t("admin.sports.title")}
			description={t("admin.sports.description")}
		>
			{errorMessage ? (
				<p className="account-history__message account-history__message--error" role="alert">
					{errorMessage}
				</p>
			) : null}
			{successMessage ? (
				<p className="account-history__message account-history__message--success" role="status">
					{successMessage}
				</p>
			) : null}

			<section className="admin-section">
				<div className="admin-section__head">
					<h2 className="admin-section__title">{t("admin.sports.addTitle")}</h2>
					<p className="admin-section__description">
						{t("admin.sports.addDescription")}
					</p>
				</div>
				<form action={createAction} className="admin-form admin-form--panel">
					<div className="admin-form__panel-grid">
						<div className="admin-form__group">
							<label className="admin-form__label" htmlFor="sport-name">{t("admin.common.fields.name")}</label>
							<input id="sport-name" name="name" className="admin-form__field" placeholder="Table Tennis" required />
						</div>
						<div className="admin-form__group">
							<label className="admin-form__label" htmlFor="sport-slug">Slug</label>
							<input id="sport-slug" name="slug" className="admin-form__field" placeholder="table-tennis" pattern="[a-z0-9-]+" required />
						</div>
						<div className="admin-form__group">
							<label className="admin-form__label" htmlFor="sport-icon">{t("admin.sports.fields.icon")}</label>
							<input id="sport-icon" name="icon" className="admin-form__field" placeholder="TT" />
						</div>
						<div className="admin-form__group">
							<label className="admin-form__label" htmlFor="sport-sort-order">{t("admin.sports.fields.sortOrder")}</label>
							<input id="sport-sort-order" name="sortOrder" type="number" step="1" className="admin-form__field" defaultValue={100} required />
						</div>
						<div className="admin-form__group">
							<label className="admin-form__label" htmlFor="sport-rental-service-name">{t("admin.sports.fields.rentalService")}</label>
							<input id="sport-rental-service-name" name="rentalServiceName" className="admin-form__field" placeholder={t("admin.sports.placeholders.rentalServiceName")} />
						</div>
						<div className="admin-form__group">
							<label className="admin-form__label" htmlFor="sport-rental-service-code">{t("admin.sports.fields.serviceCode")}</label>
							<input id="sport-rental-service-code" name="rentalServiceCode" className="admin-form__field" placeholder="table-tennis-rental" pattern="[a-z0-9-]+" />
						</div>
						<div className="admin-form__group">
							<label className="admin-form__label" htmlFor="sport-price-morning">{t("admin.sports.fields.weekdayDayPrice")}</label>
							<input id="sport-price-morning" name="courtPriceMorningKzt" type="number" min="0" step="1" className="admin-form__field" defaultValue={0} required />
						</div>
						<div className="admin-form__group">
							<label className="admin-form__label" htmlFor="sport-price-evening">{t("admin.sports.fields.eveningWeekendPrice")}</label>
							<input id="sport-price-evening" name="courtPriceEveningWeekendKzt" type="number" min="0" step="1" className="admin-form__field" defaultValue={0} required />
						</div>
						<div className="admin-form__group">
							<label className="admin-form__checkbox">
								<input name="active" type="checkbox" defaultChecked />
								<span>{t("admin.common.active")}</span>
							</label>
						</div>
					</div>
					<div className="admin-form__actions">
						<button type="submit" className="admin-form__submit">{t("admin.sports.addSubmit")}</button>
					</div>
				</form>
			</section>

			<div className="admin-table">
				<table className="admin-table__table">
					<thead>
						<tr className="admin-table__row">
							<th className="admin-table__cell admin-table__cell--head">{t("admin.sports.table.sportAndRentalService")}</th>
							<th className="admin-table__cell admin-table__cell--head">{t("admin.sports.table.courtPrices")}</th>
							<th className="admin-table__cell admin-table__cell--head">{t("admin.sports.table.courts")}</th>
							<th className="admin-table__cell admin-table__cell--head">{t("admin.common.table.status")}</th>
							<th className="admin-table__cell admin-table__cell--head">{t("admin.common.table.actions")}</th>
						</tr>
					</thead>
					<tbody>
						{sports.length === 0 ? (
							<tr className="admin-table__row">
								<td className="admin-table__cell" colSpan={5}>{t("admin.sports.empty")}</td>
							</tr>
						) : (
							sports.map((sport) => (
								<tr key={sport.id} className="admin-table__row">
									<td className="admin-table__cell">
										<div className="admin-bookings__cell-title">{sport.name}</div>
										<div className="admin-bookings__cell-sub">{t("admin.sports.iconMeta", { slug: sport.slug, icon: sport.icon ?? "—" })}</div>
									</td>
									<td className="admin-table__cell">
										<div>{t("admin.sports.weekdayDayPriceValue", { price: sport.courtBasePriceMorningKzt.toLocaleString("ru-KZ") })}</div>
										<div className="admin-bookings__cell-sub">{t("admin.sports.eveningWeekendPriceValue", { price: sport.courtBasePriceEveningWeekendKzt.toLocaleString("ru-KZ") })}</div>
									</td>
									<td className="admin-table__cell">
										<div>{sport.courtsCount}</div>
										<a href="/admin/courts" className="admin-inline-links__item">{t("admin.sports.openCourts")}</a>
									</td>
									<td className="admin-table__cell">
										<span className={`admin-status-badge ${sport.active ? "admin-status-badge--active" : "admin-status-badge--inactive"}`}>
											<span className="admin-status-badge__dot" aria-hidden="true" />
											{sport.active ? t("admin.common.active") : t("admin.common.inactive")}
										</span>
									</td>
									<td className="admin-table__cell">
										<div className="admin-bookings__actions">
											<AdminEditModal triggerLabel={t("admin.common.edit")} title={t("admin.sports.editTitle", { name: sport.name })}>
												<form action={updateAction} className="admin-form">
													<input type="hidden" name="sportId" value={sport.id} />
													<input type="hidden" name="rentalServiceId" value={sport.defaultRentalServiceId ?? ""} />
													<div className="admin-form__panel-grid">
														<div className="admin-form__group">
															<label className="admin-form__label" htmlFor={`sport-name-modal-${sport.id}`}>{t("admin.common.fields.name")}</label>
															<input id={`sport-name-modal-${sport.id}`} name="name" className="admin-form__field" defaultValue={sport.name} required />
														</div>
														<div className="admin-form__group">
															<label className="admin-form__label" htmlFor={`sport-slug-modal-${sport.id}`}>Slug</label>
															<input id={`sport-slug-modal-${sport.id}`} name="slug" className="admin-form__field" defaultValue={sport.slug} pattern="[a-z0-9-]+" required />
														</div>
														<div className="admin-form__group">
															<label className="admin-form__label" htmlFor={`sport-icon-modal-${sport.id}`}>{t("admin.sports.fields.icon")}</label>
															<input id={`sport-icon-modal-${sport.id}`} name="icon" className="admin-form__field" defaultValue={sport.icon ?? ""} />
														</div>
														<div className="admin-form__group">
															<label className="admin-form__label" htmlFor={`sport-sort-modal-${sport.id}`}>{t("admin.sports.fields.sortOrder")}</label>
															<input id={`sport-sort-modal-${sport.id}`} name="sortOrder" type="number" step="1" className="admin-form__field" defaultValue={sport.sortOrder} required />
														</div>
														<div className="admin-form__group">
															<label className="admin-form__label" htmlFor={`sport-svc-name-modal-${sport.id}`}>{t("admin.sports.fields.rentalService")}</label>
															<input id={`sport-svc-name-modal-${sport.id}`} name="rentalServiceName" className="admin-form__field" defaultValue={sport.defaultRentalServiceName ?? t("admin.sports.defaultRentalServiceName", { name: sport.name })} required />
														</div>
														<div className="admin-form__group">
															<label className="admin-form__label" htmlFor={`sport-svc-code-modal-${sport.id}`}>{t("admin.sports.fields.serviceCode")}</label>
															<input id={`sport-svc-code-modal-${sport.id}`} name="rentalServiceCode" className="admin-form__field" defaultValue={sport.defaultRentalServiceCode ?? `${sport.slug}-rental`} pattern="[a-z0-9-]+" required />
														</div>
														<div className="admin-form__group">
															<label className="admin-form__label" htmlFor={`sport-price-m-modal-${sport.id}`}>{t("admin.sports.fields.weekdayDayShort")}</label>
															<input id={`sport-price-m-modal-${sport.id}`} name="courtPriceMorningKzt" type="number" min="0" step="1" className="admin-form__field" defaultValue={sport.courtBasePriceMorningKzt} required />
														</div>
														<div className="admin-form__group">
															<label className="admin-form__label" htmlFor={`sport-price-e-modal-${sport.id}`}>{t("admin.sports.fields.eveningWeekendShort")}</label>
															<input id={`sport-price-e-modal-${sport.id}`} name="courtPriceEveningWeekendKzt" type="number" min="0" step="1" className="admin-form__field" defaultValue={sport.courtBasePriceEveningWeekendKzt} required />
														</div>
													</div>
													<div className="admin-form__actions">
														<button type="submit" className="admin-form__submit">{t("admin.sports.saveConfiguration")}</button>
													</div>
												</form>
											</AdminEditModal>
											<form action={toggleActiveAction} className="admin-bookings__actions">
												<input type="hidden" name="sportId" value={sport.id} />
												<input type="hidden" name="nextActive" value={String(!sport.active)} />
												<button type="submit" className="admin-bookings__action-button">
													{sport.active ? t("admin.common.disable") : t("admin.common.enable")}
												</button>
											</form>
											<AdminConfirmActionForm
												action={deleteAction}
												hiddenFields={{ sportId: sport.id }}
												triggerLabel={t("admin.common.delete")}
												confirmLabel={t("admin.sports.deleteConfirm")}
												title={t("admin.sports.deleteTitle")}
												description={t("admin.sports.deleteDescription")}
											/>
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
