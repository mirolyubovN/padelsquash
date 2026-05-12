import { revalidatePath } from "next/cache";
import { AdminPageShell } from "@/src/components/admin/admin-page-shell";
import { assertSuperAdmin } from "@/src/lib/auth/guards";
import { t } from "@/src/lib/i18n";
import {
	COURT_BASE_PRICING_PERIOD_LABELS,
	getCourtBasePriceMatrix,
	saveCourtBasePriceMatrixFromForm,
} from "@/src/lib/settings/service";
import { buildPageMetadata } from "@/src/lib/seo/metadata";

export const metadata = buildPageMetadata({
	title: "Админ: матрица цен | Racket Community Kst",
	description: "Базовая матрица цен на аренду кортов по спорту и тарифным периодам.",
	path: "/admin/pricing/base",
	noIndex: true,
});

export const dynamic = "force-dynamic";

export default async function AdminBasePricingPage() {
	await assertSuperAdmin();
	const matrix = await getCourtBasePriceMatrix();

	async function saveAction(formData: FormData) {
		"use server";
		await assertSuperAdmin();
		await saveCourtBasePriceMatrixFromForm(formData);
		revalidatePath("/admin/pricing/base");
		revalidatePath("/prices");
		revalidatePath("/");
	}

	return (
		<AdminPageShell
			title={t("admin.pricingBase.title")}
			description={t("admin.pricingBase.description")}
		>
			<form action={saveAction} className="admin-form">
				<div className="admin-table">
					<table className="admin-table__table">
						<thead>
							<tr className="admin-table__row">
								<th className="admin-table__cell admin-table__cell--head">{t("admin.pricingBase.table.position")}</th>
								<th className="admin-table__cell admin-table__cell--head">
									{COURT_BASE_PRICING_PERIOD_LABELS.off_peak}
								</th>
								<th className="admin-table__cell admin-table__cell--head">
									{COURT_BASE_PRICING_PERIOD_LABELS.peak}
								</th>
							</tr>
						</thead>
						<tbody>
							{matrix.map((row) => (
								<tr key={row.sport} className="admin-table__row">
									<td className="admin-table__cell">{row.label}</td>
									<td className="admin-table__cell">
										<input
											className="admin-form__field"
											type="number"
											min="0"
											step="1"
											name={`${row.sport}_court_off_peak`}
											defaultValue={row.values.off_peak}
											required
										/>
									</td>
									<td className="admin-table__cell">
										<input
											className="admin-form__field"
											type="number"
											min="0"
											step="1"
											name={`${row.sport}_court_peak`}
											defaultValue={row.values.peak}
											required
										/>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
				<div className="admin-form__actions">
					<button type="submit" className="admin-form__submit">
						{t("admin.pricingBase.save")}
					</button>
				</div>
			</form>
		</AdminPageShell>
	);
}
