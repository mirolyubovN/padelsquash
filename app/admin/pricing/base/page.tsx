import { revalidatePath } from "next/cache";
import { AdminPageShell } from "@/src/components/admin/admin-page-shell";
import { assertAdmin } from "@/src/lib/auth/guards";
import {
  COURT_BASE_PRICING_PERIOD_LABELS,
  getCourtBasePriceMatrix,
  saveCourtBasePriceMatrixFromForm,
} from "@/src/lib/settings/service";

export const dynamic = "force-dynamic";

export default async function AdminBasePricingPage() {
  await assertAdmin();
  const matrix = await getCourtBasePriceMatrix();

  async function saveAction(formData: FormData) {
    "use server";
    await assertAdmin();
    await saveCourtBasePriceMatrixFromForm(formData);
    revalidatePath("/admin/pricing/base");
    revalidatePath("/prices");
    revalidatePath("/");
  }

  return (
    <AdminPageShell
      title="Матрица цен"
      description="Базовые цены кортов по спорту. Тренировки не настраиваются здесь: стоимость тренера задается отдельно в карточке каждого тренера."
    >
      <form action={saveAction} className="admin-form">
        <div className="admin-table">
          <table className="admin-table__table">
            <thead>
              <tr className="admin-table__row">
                <th className="admin-table__cell admin-table__cell--head">Позиция</th>
                <th className="admin-table__cell admin-table__cell--head">
                  {COURT_BASE_PRICING_PERIOD_LABELS.morning}
                </th>
                <th className="admin-table__cell admin-table__cell--head">
                  {COURT_BASE_PRICING_PERIOD_LABELS.evening_weekend}
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
                      name={`${row.sport}_court_morning`}
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
                      name={`${row.sport}_court_evening_weekend`}
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
