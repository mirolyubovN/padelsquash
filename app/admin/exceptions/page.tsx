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
      title="Исключения"
      description="Единый список блокировок по площадке, кортам и тренерам. Используется в расчете доступности."
    >
      <form action={createAction} className="admin-form">
        <div className="admin-table">
          <table className="admin-table__table">
            <tbody>
              <tr className="admin-table__row">
                <td className="admin-table__cell">
                  <label className="admin-form__label" htmlFor="exception-target">
                    Ресурс
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
                    Дата
                  </label>
                  <input id="exception-date" name="date" type="date" className="admin-form__field" required />
                </td>
                <td className="admin-table__cell">
                  <label className="admin-form__label" htmlFor="exception-start">
                    Начало
                  </label>
                  <input
                    id="exception-start"
                    name="startTime"
                    type="time"
                    className="admin-form__field"
                    required
                  />
                </td>
                <td className="admin-table__cell">
                  <label className="admin-form__label" htmlFor="exception-end">
                    Конец
                  </label>
                  <input
                    id="exception-end"
                    name="endTime"
                    type="time"
                    className="admin-form__field"
                    required
                  />
                </td>
                <td className="admin-table__cell">
                  <label className="admin-form__label" htmlFor="exception-type">
                    Тип
                  </label>
                  <select
                    id="exception-type"
                    name="type"
                    className="admin-form__field"
                    defaultValue="closed"
                  >
                    <option value="closed">Закрыто</option>
                    <option value="maintenance">Тех. обслуживание</option>
                  </select>
                </td>
              </tr>
              <tr className="admin-table__row">
                <td className="admin-table__cell" colSpan={4}>
                  <label className="admin-form__label" htmlFor="exception-note">
                    Комментарий (опционально)
                  </label>
                  <input
                    id="exception-note"
                    name="note"
                    className="admin-form__field"
                    placeholder="Например: закрытие на мероприятие"
                  />
                </td>
                <td className="admin-table__cell">
                  <div className="admin-form__actions">
                    <button type="submit" className="admin-form__submit">
                      Добавить исключение
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
              <th className="admin-table__cell admin-table__cell--head">Ресурс</th>
              <th className="admin-table__cell admin-table__cell--head">Дата</th>
              <th className="admin-table__cell admin-table__cell--head">Время</th>
              <th className="admin-table__cell admin-table__cell--head">Тип</th>
              <th className="admin-table__cell admin-table__cell--head">Комментарий</th>
              <th className="admin-table__cell admin-table__cell--head">Действия</th>
            </tr>
          </thead>
          <tbody>
            {exceptions.length === 0 ? (
              <tr className="admin-table__row">
                <td className="admin-table__cell" colSpan={6}>
                  Исключений пока нет.
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
                        Удалить
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
