import { AdminPageShell } from "@/src/components/admin/admin-page-shell";
import { AdminTable } from "@/src/components/admin/admin-table";
import { assertSuperAdmin } from "@/src/lib/auth/guards";
import { buildPageMetadata } from "@/src/lib/seo/metadata";

export const metadata = buildPageMetadata({
  title: "Админ: периоды цен | Padel & Squash KZ",
  description: "Справочник тарифных периодов клуба: утро, день и вечер/выходные для применения матрицы цен.",
  path: "/admin/pricing/rules",
  noIndex: true,
});

export const dynamic = "force-dynamic";

export default async function AdminPricingRulesPage() {
  await assertSuperAdmin();
  return (
    <AdminPageShell
      title="Периоды цен"
      description="Вместо сложных правил используется фиксированная схема периодов: утро, день, вечер/выходные."
    >
      <AdminTable
        columns={["Период", "Когда действует", "Применение", "Активно"]}
        rows={[
          ["Утро", "Пн-Пт 07:00-12:00", "Берется цена периода 'утро'", "Да"],
          ["День", "Пн-Пт 12:00-17:00", "Берется цена периода 'день'", "Да"],
          [
            "Вечер / выходные",
            "Пн-Пт 17:00-23:00 и Сб-Вс весь день",
            "Берется цена периода 'вечер/выходные'",
            "Да",
          ],
        ]}
      />
    </AdminPageShell>
  );
}
