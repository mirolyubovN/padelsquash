import { revalidatePath } from "next/cache";
import { AdminPageShell } from "@/src/components/admin/admin-page-shell";
import { assertAdmin } from "@/src/lib/auth/guards";
import {
  createCourtExceptionFromForm,
  deleteScheduleExceptionForResource,
  EXCEPTION_TYPE_LABELS,
  getCourtExceptionsPageData,
} from "@/src/lib/admin/resources";
import { buildPageMetadata } from "@/src/lib/seo/metadata";

export const metadata = buildPageMetadata({
  title: "Админ: исключения корта | Padel & Squash KZ",
  description: "Разовые исключения доступности для выбранного корта: блокировки, закрытия и техническое обслуживание.",
  path: "/admin/courts/[id]/exceptions",
  noIndex: true,
});

export const dynamic = "force-dynamic";

export default async function AdminCourtExceptionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await assertAdmin();
  const { id } = await params;
  const data = await getCourtExceptionsPageData(id);

  async function addExceptionAction(formData: FormData) {
    "use server";
    await assertAdmin();
    await createCourtExceptionFromForm({ courtId: id, formData });
    revalidatePath(`/admin/courts/${id}/exceptions`);
    revalidatePath("/admin/exceptions");
  }

  async function deleteExceptionAction(formData: FormData) {
    "use server";
    await assertAdmin();
    const exceptionId = String(formData.get("exceptionId") ?? "");
    if (!exceptionId) {
      throw new Error("exceptionId обязателен");
    }
    await deleteScheduleExceptionForResource({
      exceptionId,
      resourceType: "court",
      resourceId: id,
    });
    revalidatePath(`/admin/courts/${id}/exceptions`);
    revalidatePath("/admin/exceptions");
  }

  return (
    <AdminPageShell
      title={`Исключения корта: ${data.court.name}`}
      description={`Разовые блокировки для ${data.court.sportName}-корта. Используется в расчете доступности.`}
      breadcrumbs={[
        { label: "Корты", href: "/admin/courts" },
        { label: data.court.name },
        { label: "Исключения" },
      ]}
    >
      <form action={addExceptionAction} className="admin-form">
        <div className="admin-table">
          <table className="admin-table__table">
            <tbody>
              <tr className="admin-table__row">
                <td className="admin-table__cell">
                  <label className="admin-form__label" htmlFor="court-exception-date">
                    Дата
                  </label>
                  <input id="court-exception-date" name="date" type="date" className="admin-form__field" required />
                </td>
                <td className="admin-table__cell">
                  <label className="admin-form__label" htmlFor="court-exception-start">
                    Начало
                  </label>
                  <input
                    id="court-exception-start"
                    name="startTime"
                    type="time"
                    className="admin-form__field"
                    required
                  />
                </td>
                <td className="admin-table__cell">
                  <label className="admin-form__label" htmlFor="court-exception-end">
                    Конец
                  </label>
                  <input
                    id="court-exception-end"
                    name="endTime"
                    type="time"
                    className="admin-form__field"
                    required
                  />
                </td>
                <td className="admin-table__cell">
                  <label className="admin-form__label" htmlFor="court-exception-type">
                    Тип
                  </label>
                  <select
                    id="court-exception-type"
                    name="type"
                    className="admin-form__field"
                    defaultValue="maintenance"
                  >
                    <option value="maintenance">Тех. обслуживание</option>
                    <option value="closed">Закрыто</option>
                  </select>
                </td>
              </tr>
              <tr className="admin-table__row">
                <td className="admin-table__cell" colSpan={3}>
                  <label className="admin-form__label" htmlFor="court-exception-note">
                    Комментарий (опционально)
                  </label>
                  <input
                    id="court-exception-note"
                    name="note"
                    className="admin-form__field"
                    placeholder="Например: ремонт стекла"
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
              <th className="admin-table__cell admin-table__cell--head">Дата</th>
              <th className="admin-table__cell admin-table__cell--head">Время</th>
              <th className="admin-table__cell admin-table__cell--head">Тип</th>
              <th className="admin-table__cell admin-table__cell--head">Комментарий</th>
              <th className="admin-table__cell admin-table__cell--head">Действия</th>
            </tr>
          </thead>
          <tbody>
            {data.exceptions.length === 0 ? (
              <tr className="admin-table__row">
                <td className="admin-table__cell" colSpan={5}>
                  Исключений по корту пока нет.
                </td>
              </tr>
            ) : (
              data.exceptions.map((row) => (
                <tr key={row.id} className="admin-table__row">
                  <td className="admin-table__cell">{row.date}</td>
                  <td className="admin-table__cell">
                    {row.startTime} - {row.endTime}
                  </td>
                  <td className="admin-table__cell">{EXCEPTION_TYPE_LABELS[row.type]}</td>
                  <td className="admin-table__cell">{row.note ?? "—"}</td>
                  <td className="admin-table__cell">
                    <form action={deleteExceptionAction} className="admin-bookings__actions">
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
