import { AdminPageShell } from "@/src/components/admin/admin-page-shell";
import { AdminTable } from "@/src/components/admin/admin-table";
import { assertSuperAdmin } from "@/src/lib/auth/guards";
import { t } from "@/src/lib/i18n";
import { buildPageMetadata } from "@/src/lib/seo/metadata";

export const metadata = buildPageMetadata({
	title: "Админ: периоды цен | Racket Community Kst",
	description: "Справочник тарифных периодов клуба: утро, день и вечер/выходные для применения матрицы цен.",
	path: "/admin/pricing/rules",
	noIndex: true,
});

export const dynamic = "force-dynamic";

export default async function AdminPricingRulesPage() {
	await assertSuperAdmin();
	return (
		<AdminPageShell
			title={t("admin.pricingRules.title")}
			description={t("admin.pricingRules.description")}
		>
			<AdminTable
				columns={[
					t("admin.pricingRules.table.period"),
					t("admin.pricingRules.table.when"),
					t("admin.pricingRules.table.application"),
					t("admin.pricingRules.table.active"),
				]}
				rows={[
					[
						t("admin.pricingRules.periods.offPeak"),
						t("admin.pricingRules.when.offPeak"),
						t("admin.pricingRules.application.offPeak"),
						t("admin.common.yes"),
					],
					[
						t("admin.pricingRules.periods.peak"),
						t("admin.pricingRules.when.peak"),
						t("admin.pricingRules.application.peak"),
						t("admin.common.yes"),
					],
				]}
			/>
		</AdminPageShell>
	);
}
