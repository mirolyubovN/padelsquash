import { revalidatePath } from "next/cache";
import { AdminPageShell } from "@/src/components/admin/admin-page-shell";
import { assertAdmin } from "@/src/lib/auth/guards";
import {
  getComponentPriceMatrix,
  PRICING_PERIOD_LABELS,
  saveComponentPriceMatrixFromForm,
} from "@/src/lib/settings/service";

export const dynamic = "force-dynamic";

export default async function AdminBasePricingPage() {
  await assertAdmin();
  const matrix = await getComponentPriceMatrix();

  async function saveAction(formData: FormData) {
    "use server";
    await assertAdmin();
    await saveComponentPriceMatrixFromForm(formData);
    revalidatePath("/admin/pricing/base");
    revalidatePath("/prices");
  }

  return (
    <AdminPageShell
      title="Матрица цен"
      description="Фиксированные цены по компонентам (корт / тренер), спорту и периоду. Изменения сохраняются в БД."
    >
      <form action={saveAction} className="admin-form">
        <div className="admin-table">
          <table className="admin-table__table">
            <thead>
              <tr className="admin-table__row">
                <th className="admin-table__cell admin-table__cell--head">Позиция</th>
                <th className="admin-table__cell admin-table__cell--head">
                  {PRICING_PERIOD_LABELS.morning}
                </th>
                <th className="admin-table__cell admin-table__cell--head">
                  {PRICING_PERIOD_LABELS.day}
                </th>
                <th className="admin-table__cell admin-table__cell--head">
                  {PRICING_PERIOD_LABELS.evening_weekend}
                </th>
              </tr>
            </thead>
            <tbody>
              {matrix.map((row) => (
                <tr key={`${row.sport}-${row.componentType}`} className="admin-table__row">
                  <td className="admin-table__cell">{row.label}</td>
                  <td className="admin-table__cell">
                    <input
                      className="admin-form__field"
                      type="number"
                      min="0"
                      step="1"
                      name={`${row.sport}_${row.componentType}_morning`}
                      defaultValue={row.values.morning}
                      required
                    />
                  </td>
                  <td className="admin-table__cell">
                    <input
                      className="admin-form__field"
                      type="number"
                      min="0"
                      step="1"
                      name={`${row.sport}_${row.componentType}_day`}
                      defaultValue={row.values.day}
                      required
                    />
                  </td>
                  <td className="admin-table__cell">
                    <input
                      className="admin-form__field"
                      type="number"
                      min="0"
                      step="1"
                      name={`${row.sport}_${row.componentType}_evening_weekend`}
                      defaultValue={row.values.evening_weekend}
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
            Сохранить матрицу цен
          </button>
        </div>
      </form>
    </AdminPageShell>
  );
}
