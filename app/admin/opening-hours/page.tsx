import { revalidatePath } from "next/cache";
import { AdminPageShell } from "@/src/components/admin/admin-page-shell";
import { assertSuperAdmin } from "@/src/lib/auth/guards";
import { t } from "@/src/lib/i18n";
import { getOpeningHours, saveOpeningHoursFromForm, WEEKDAY_LABELS } from "@/src/lib/settings/service";
import { buildPageMetadata } from "@/src/lib/seo/metadata";

export const metadata = buildPageMetadata({
  title: "Админ: часы работы | Padel & Squash KZ",
  description: "Настройка часов работы площадки по дням недели для расчета доступности и бронирования.",
  path: "/admin/opening-hours",
  noIndex: true,
});

export const dynamic = "force-dynamic";

export default async function AdminOpeningHoursPage() {
  await assertSuperAdmin();
  const openingHours = await getOpeningHours();

  async function saveAction(formData: FormData) {
    "use server";
    await assertSuperAdmin();
    await saveOpeningHoursFromForm(formData);
    revalidatePath("/admin/opening-hours");
  }

  return (
    <AdminPageShell
      title={t("admin.openingHours.title")}
      description={t("admin.openingHours.description")}
    >
      <form action={saveAction} className="admin-form">
        <div className="admin-table">
          <table className="admin-table__table">
            <thead className="admin-table__head">
              <tr className="admin-table__row">
                <th className="admin-table__cell admin-table__cell--head">{t("admin.openingHours.table.day")}</th>
                <th className="admin-table__cell admin-table__cell--head">{t("admin.openingHours.table.openTime")}</th>
                <th className="admin-table__cell admin-table__cell--head">{t("admin.openingHours.table.closeTime")}</th>
                <th className="admin-table__cell admin-table__cell--head">{t("admin.openingHours.table.active")}</th>
              </tr>
            </thead>
            <tbody className="admin-table__body">
              {openingHours.map((row) => (
                <tr key={row.dayOfWeek} className="admin-table__row">
                  <td className="admin-table__cell">{WEEKDAY_LABELS[row.dayOfWeek]}</td>
                  <td className="admin-table__cell">
                    <input
                      name={`openTime_${row.dayOfWeek}`}
                      type="time"
                      defaultValue={row.openTime}
                      className="admin-form__field"
                      required
                    />
                  </td>
                  <td className="admin-table__cell">
                    <input
                      name={`closeTime_${row.dayOfWeek}`}
                      type="time"
                      defaultValue={row.closeTime}
                      className="admin-form__field"
                      required
                    />
                  </td>
                  <td className="admin-table__cell">
                    <label className="admin-form__checkbox">
                      <input
                        name={`active_${row.dayOfWeek}`}
                        type="checkbox"
                        defaultChecked={row.active}
                      />
                      <span>{t("admin.common.yes")}</span>
                    </label>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="admin-form__actions">
          <button type="submit" className="admin-form__submit">
            {t("admin.openingHours.save")}
          </button>
        </div>
      </form>
    </AdminPageShell>
  );
}
