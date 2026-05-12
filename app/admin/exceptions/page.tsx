import { revalidatePath } from "next/cache";
import { AdminPageShell } from "@/src/components/admin/admin-page-shell";
import { assertAdmin } from "@/src/lib/auth/guards";
import {
	createGlobalExceptionFromForm,
	deleteScheduleExceptionById,
	EXCEPTION_TYPE_LABELS,
	getAdminExceptions,
	getExceptionTargetOptions,
} from "@/src/lib/admin/resources";
import { t } from "@/src/lib/i18n";
import { buildPageMetadata } from "@/src/lib/seo/metadata";

export const metadata = buildPageMetadata({
	title: "Админ: исключения | Racket Community Kst",
	description: "Разовые исключения и блокировки доступности для площадки, кортов и тренеров.",
	path: "/admin/exceptions",
	noIndex: true,
});

export const dynamic = "force-dynamic";

export default async function AdminExceptionsPage() {
	await assertAdmin();

	const [exceptions, targetOptions] = await Promise.all([
		getAdminExceptions(300),
		getExceptionTargetOptions(),
	]);

	async function createAction(formData: FormData) {
		"use server";
		await assertAdmin();
		await createGlobalExceptionFromForm(formData);
		revalidatePath("/admin/exceptions");
	}

	async function deleteAction(formData: FormData) {
		"use server";
		await assertAdmin();

		const exceptionId = String(formData.get("exceptionId") ?? "");
		if (!exceptionId) {
			throw new Error("exceptionId обязателен");
		}

		await deleteScheduleExceptionById(exceptionId);
		revalidatePath("/admin/exceptions");
	}

	return (
		<AdminPageShell
			title={t("admin.exceptions.title")}
			description={t("admin.exceptions.description")}
		>
			<form action={createAction} className="admin-form">
				<div className="admin-table">
					<table className="admin-table__table">
						<tbody>
							<tr className="admin-table__row">
								<td className="admin-table__cell">
									<label className="admin-form__label" htmlFor="exception-target">
										{t("admin.exceptions.form.resource")}
									</label>
									<select
										id="exception-target"
										name="target"
										className="admin-form__field"
										defaultValue="venue"
									>
										{targetOptions.map((option) => (
											<option key={option.value} value={option.value}>
												{option.label}
											</option>
										))}
									</select>
								</td>
								<td className="admin-table__cell">
									<label className="admin-form__label" htmlFor="exception-date">
										{t("admin.exceptions.form.date")}
									</label>
									<input id="exception-date" name="date" type="date" lang="ru-RU" className="admin-form__field" required />
								</td>
								<td className="admin-table__cell">
									<label className="admin-form__label" htmlFor="exception-start">
										{t("admin.exceptions.form.start")}
									</label>
									<input
										id="exception-start"
										name="startTime"
										type="time" lang="ru-RU"
										className="admin-form__field"
										required
									/>
								</td>
								<td className="admin-table__cell">
									<label className="admin-form__label" htmlFor="exception-end">
										{t("admin.exceptions.form.end")}
									</label>
									<input
										id="exception-end"
										name="endTime"
										type="time" lang="ru-RU"
										className="admin-form__field"
										required
									/>
								</td>
								<td className="admin-table__cell">
									<label className="admin-form__label" htmlFor="exception-type">
										{t("admin.exceptions.form.type")}
									</label>
									<select
										id="exception-type"
										name="type"
										className="admin-form__field"
										defaultValue="closed"
									>
										<option value="closed">{t("admin.exceptions.type.closed")}</option>
										<option value="maintenance">{t("admin.exceptions.type.maintenance")}</option>
									</select>
								</td>
							</tr>
							<tr className="admin-table__row">
								<td className="admin-table__cell" colSpan={4}>
									<label className="admin-form__label" htmlFor="exception-note">
										{t("admin.exceptions.form.note")}
									</label>
									<input
										id="exception-note"
										name="note"
										className="admin-form__field"
										placeholder={t("admin.exceptions.form.notePlaceholder")}
									/>
								</td>
								<td className="admin-table__cell">
									<div className="admin-form__actions">
										<button type="submit" className="admin-form__submit">
											{t("admin.exceptions.add")}
										</button>
									</div>
								</td>
							</tr>
						</tbody>
					</table>
				</div>
			</form>

			<div className="admin-table">
				<table className="admin-table__table">
					<thead>
						<tr className="admin-table__row">
							<th className="admin-table__cell admin-table__cell--head">{t("admin.exceptions.table.resource")}</th>
							<th className="admin-table__cell admin-table__cell--head">{t("admin.exceptions.table.date")}</th>
							<th className="admin-table__cell admin-table__cell--head">{t("admin.exceptions.table.time")}</th>
							<th className="admin-table__cell admin-table__cell--head">{t("admin.exceptions.table.type")}</th>
							<th className="admin-table__cell admin-table__cell--head">{t("admin.exceptions.table.note")}</th>
							<th className="admin-table__cell admin-table__cell--head">{t("admin.exceptions.table.actions")}</th>
						</tr>
					</thead>
					<tbody>
						{exceptions.length === 0 ? (
							<tr className="admin-table__row">
								<td className="admin-table__cell" colSpan={6}>
									{t("admin.exceptions.empty")}
								</td>
							</tr>
						) : (
							exceptions.map((row) => (
								<tr key={row.id} className="admin-table__row">
									<td className="admin-table__cell">
										<div className="admin-bookings__cell-title">{row.resourceLabel}</div>
										<div className="admin-bookings__cell-sub">{row.resourceId ?? "venue"}</div>
									</td>
									<td className="admin-table__cell">{row.date}</td>
									<td className="admin-table__cell">
										{row.startTime} - {row.endTime}
									</td>
									<td className="admin-table__cell">{EXCEPTION_TYPE_LABELS[row.type]}</td>
									<td className="admin-table__cell">{row.note ?? "—"}</td>
									<td className="admin-table__cell">
										<form action={deleteAction} className="admin-bookings__actions">
											<input type="hidden" name="exceptionId" value={row.id} />
											<button type="submit" className="admin-bookings__action-button">
												{t("admin.common.delete")}
											</button>
										</form>
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
