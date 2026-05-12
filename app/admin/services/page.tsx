import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { AdminPageShell } from "@/src/components/admin/admin-page-shell";
import { AdminConfirmActionForm } from "@/src/components/admin/admin-confirm-action-form";
import { AdminEditModal } from "@/src/components/admin/admin-edit-modal";
import { assertAdmin } from "@/src/lib/auth/guards";
import {
	createServiceFromForm,
	deleteService,
	getAdminServices,
	getAdminSportOptions,
	getServiceResourceDescription,
	setServiceActive,
	updateServiceFromForm,
} from "@/src/lib/admin/resources";
import { buildPageMetadata } from "@/src/lib/seo/metadata";
import { t } from "@/src/lib/i18n";

export const metadata = buildPageMetadata({
	title: "Админ: услуги | Racket Community Kst",
	description: "Управление услугами клуба: аренда и тренировка, код услуги, спорт, активность и параметры расчета.",
	path: "/admin/services",
	noIndex: true,
});

export const dynamic = "force-dynamic";

export default async function AdminServicesPage({
	searchParams,
}: {
	searchParams: Promise<{ error?: string; success?: string }>;
}) {
	await assertAdmin();
	const params = await searchParams;
	const [services, sportOptions] = await Promise.all([getAdminServices(), getAdminSportOptions()]);
	const defaultSportId = sportOptions[0]?.id ?? "";
	const errorMessage =
		params.error === "delete_blocked"
			? t("admin.services.deleteBlocked")
			: params.error === "delete_failed"
				? t("admin.services.deleteFailed")
				: null;
	const successMessage = params.success === "deleted" ? t("admin.services.deleted") : null;

	async function createAction(formData: FormData) {
		"use server";
		await assertAdmin();
		await createServiceFromForm(formData);
		revalidatePath("/admin/services");
		revalidatePath("/book");
	}

	async function toggleActiveAction(formData: FormData) {
		"use server";
		await assertAdmin();

		const serviceId = String(formData.get("serviceId") ?? "");
		const nextActive = String(formData.get("nextActive") ?? "") === "true";

		if (!serviceId) {
			throw new Error("serviceId обязателен");
		}

		await setServiceActive({ serviceId, active: nextActive });
		revalidatePath("/admin/services");
		revalidatePath("/book");
	}

	async function updateAction(formData: FormData) {
		"use server";
		await assertAdmin();
		await updateServiceFromForm(formData);
		revalidatePath("/admin/services");
		revalidatePath("/book");
	}

	async function deleteAction(formData: FormData) {
		"use server";
		await assertAdmin();

		const serviceId = String(formData.get("serviceId") ?? "");
		if (!serviceId) {
			throw new Error("serviceId обязателен");
		}

		try {
			await deleteService(serviceId);
		} catch (error) {
			const message = error instanceof Error ? error.message : "";
			if (message.includes("уже есть бронирования")) {
				redirect("/admin/services?error=delete_blocked");
			}
			redirect("/admin/services?error=delete_failed");
		}

		revalidatePath("/admin/services");
		revalidatePath("/book");
		redirect("/admin/services?success=deleted");
	}

	return (
		<AdminPageShell
			title={t("admin.services.title")}
			description={t("admin.services.description")}
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
					<h2 className="admin-section__title">{t("admin.services.addTitle")}</h2>
					<p className="admin-section__description">{t("admin.services.addDescription")}</p>
				</div>
				<form action={createAction} className="admin-form admin-form--panel">
					<div className="admin-form__panel-grid">
						<div className="admin-form__group">
							<label className="admin-form__label" htmlFor="service-code">
								{t("admin.common.fields.code")}
							</label>
							<input
								id="service-code"
								name="code"
								className="admin-form__field"
								placeholder="padel-rental"
								pattern="[a-z0-9-]+"
								required
							/>
						</div>
						<div className="admin-form__group">
							<label className="admin-form__label" htmlFor="service-name">
								{t("admin.common.fields.name")}
							</label>
							<input
								id="service-name"
								name="name"
								className="admin-form__field"
								placeholder={t("admin.services.placeholders.name")}
								required
							/>
						</div>
						<div className="admin-form__group">
							<label className="admin-form__label" htmlFor="service-sport">
								{t("admin.common.fields.sport")}
							</label>
							<select id="service-sport" name="sportId" className="admin-form__field" defaultValue={defaultSportId} required>
								{sportOptions.map((sport) => (
									<option key={sport.id} value={sport.id}>
										{sport.name}
									</option>
								))}
							</select>
						</div>
						<div className="admin-form__group">
							<label className="admin-form__checkbox">
								<input name="includesInstructor" type="checkbox" />
								<span>{t("admin.services.fields.includesInstructor")}</span>
							</label>
						</div>
					</div>
					<div className="admin-form__actions">
						<button type="submit" className="admin-form__submit">
							{t("admin.services.addSubmit")}
						</button>
					</div>
				</form>
			</section>

			<div className="admin-table">
				<table className="admin-table__table">
					<thead>
						<tr className="admin-table__row">
							<th className="admin-table__cell admin-table__cell--head">{t("admin.services.table.service")}</th>
							<th className="admin-table__cell admin-table__cell--head">{t("admin.common.table.sport")}</th>
							<th className="admin-table__cell admin-table__cell--head">{t("admin.services.table.type")}</th>
							<th className="admin-table__cell admin-table__cell--head">{t("admin.services.table.resources")}</th>
							<th className="admin-table__cell admin-table__cell--head">{t("admin.services.table.session")}</th>
							<th className="admin-table__cell admin-table__cell--head">{t("admin.services.table.active")}</th>
							<th className="admin-table__cell admin-table__cell--head">{t("admin.common.table.actions")}</th>
						</tr>
					</thead>
					<tbody>
						{services.length === 0 ? (
							<tr className="admin-table__row">
								<td className="admin-table__cell" colSpan={7}>
									{t("admin.services.empty")}
								</td>
							</tr>
						) : (
							services.map((service) => (
								<tr key={service.id} className="admin-table__row">
									<td className="admin-table__cell">
										<div className="admin-bookings__cell-title">{service.name}</div>
										<div className="admin-bookings__cell-sub">{service.code}</div>
									</td>
									<td className="admin-table__cell">{service.sportName}</td>
									<td className="admin-table__cell">
										{service.requiresInstructor ? t("admin.services.type.training") : t("admin.services.type.rental")}
									</td>
									<td className="admin-table__cell">{getServiceResourceDescription(service)}</td>
									<td className="admin-table__cell">{t("admin.services.sessionDuration")}</td>
									<td className="admin-table__cell">
										<span className={`admin-status-badge ${service.active ? "admin-status-badge--active" : "admin-status-badge--inactive"}`}>
											<span className="admin-status-badge__dot" aria-hidden="true" />
											{service.active ? t("admin.services.active") : t("admin.services.inactive")}
										</span>
									</td>
									<td className="admin-table__cell">
										<div className="admin-bookings__actions">
											<AdminEditModal triggerLabel={t("admin.common.edit")} title={t("admin.services.editTitle", { name: service.name })}>
												<form action={updateAction} className="admin-form">
													<input type="hidden" name="serviceId" value={service.id} />
													<div className="admin-form__group">
														<label className="admin-form__label" htmlFor={`svc-name-modal-${service.id}`}>{t("admin.common.fields.name")}</label>
														<input id={`svc-name-modal-${service.id}`} name="name" className="admin-form__field" defaultValue={service.name} required />
													</div>
													<div className="admin-form__group">
														<label className="admin-form__label" htmlFor={`svc-code-modal-${service.id}`}>{t("admin.common.fields.code")}</label>
														<input id={`svc-code-modal-${service.id}`} name="code" className="admin-form__field" defaultValue={service.code} pattern="[a-z0-9-]+" required />
													</div>
													<div className="admin-form__actions">
														<button type="submit" className="admin-form__submit">{t("admin.common.save")}</button>
													</div>
												</form>
											</AdminEditModal>
											<form action={toggleActiveAction} className="admin-bookings__actions">
												<input type="hidden" name="serviceId" value={service.id} />
												<input type="hidden" name="nextActive" value={String(!service.active)} />
												<button type="submit" className="admin-bookings__action-button">
													{service.active ? t("admin.common.disable") : t("admin.common.enable")}
												</button>
											</form>
											<AdminConfirmActionForm
												action={deleteAction}
												hiddenFields={{ serviceId: service.id }}
												triggerLabel={t("admin.common.delete")}
												confirmLabel={t("admin.services.deleteConfirm")}
												title={t("admin.services.deleteTitle")}
												description={t("admin.services.deleteDescription")}
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
