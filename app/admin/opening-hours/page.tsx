import { revalidatePath } from "next/cache";
import { AdminPageShell } from "@/src/components/admin/admin-page-shell";
import { assertAdmin } from "@/src/lib/auth/guards";
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
  await assertAdmin();
  const openingHours = await getOpeningHours();

  async function saveAction(formData: FormData) {
    "use server";
    await assertAdmin();
    await saveOpeningHoursFromForm(formData);
    revalidatePath("/admin/opening-hours");
  }

  return (
    <AdminPageShell
      title="Часы работы площадки"
      description="Недельный шаблон часов работы клуба. Изменения сохраняются в БД через Server Action."
    >
      <form action={saveAction} className="admin-form">
        <div className="admin-table">
          <table className="admin-table__table">
            <thead className="admin-table__head">
              <tr className="admin-table__row">
                <th className="admin-table__cell admin-table__cell--head">День</th>
                <th className="admin-table__cell admin-table__cell--head">Открытие</th>
                <th className="admin-table__cell admin-table__cell--head">Закрытие</th>
                <th className="admin-table__cell admin-table__cell--head">Активно</th>
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
                      <span>Да</span>
                    </label>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="admin-form__actions">
          <button type="submit" className="admin-form__submit">
            Сохранить часы работы
          </button>
        </div>
      </form>
    </AdminPageShell>
  );
}
