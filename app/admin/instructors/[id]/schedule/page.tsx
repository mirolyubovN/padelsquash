import { revalidatePath } from "next/cache";
import { AdminPageShell } from "@/src/components/admin/admin-page-shell";
import { assertAdmin } from "@/src/lib/auth/guards";
import {
  addInstructorScheduleFromForm,
  createInstructorExceptionFromForm,
  deleteInstructorSchedule,
  deleteScheduleExceptionForResource,
  EXCEPTION_TYPE_LABELS,
  getInstructorSchedulePageData,
  getScheduleWeekdayLabel,
  setInstructorScheduleActive,
} from "@/src/lib/admin/resources";

export const dynamic = "force-dynamic";

export default async function AdminInstructorSchedulePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await assertAdmin();
  const { id } = await params;
  const data = await getInstructorSchedulePageData(id);

  async function addScheduleAction(formData: FormData) {
    "use server";
    await assertAdmin();
    await addInstructorScheduleFromForm({ instructorId: id, formData });
    revalidatePath(`/admin/instructors/${id}/schedule`);
  }

  async function toggleScheduleAction(formData: FormData) {
    "use server";
    await assertAdmin();
    const scheduleId = String(formData.get("scheduleId") ?? "");
    const nextActive = String(formData.get("nextActive") ?? "") === "true";
    if (!scheduleId) {
      throw new Error("scheduleId обязателен");
    }
    await setInstructorScheduleActive({ instructorId: id, scheduleId, active: nextActive });
    revalidatePath(`/admin/instructors/${id}/schedule`);
  }

  async function deleteScheduleAction(formData: FormData) {
    "use server";
    await assertAdmin();
    const scheduleId = String(formData.get("scheduleId") ?? "");
    if (!scheduleId) {
      throw new Error("scheduleId обязателен");
    }
    await deleteInstructorSchedule({ instructorId: id, scheduleId });
    revalidatePath(`/admin/instructors/${id}/schedule`);
  }

  async function addExceptionAction(formData: FormData) {
    "use server";
    await assertAdmin();
    await createInstructorExceptionFromForm({ instructorId: id, formData });
    revalidatePath(`/admin/instructors/${id}/schedule`);
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
      resourceType: "instructor",
      resourceId: id,
    });
    revalidatePath(`/admin/instructors/${id}/schedule`);
    revalidatePath("/admin/exceptions");
  }

  return (
    <AdminPageShell
      title={`График тренера: ${data.instructor.name}`}
      description="Недельные интервалы доступности тренера и разовые исключения. Все изменения сохраняются в БД."
    >
      <form action={addScheduleAction} className="admin-form">
        <div className="admin-table">
          <table className="admin-table__table">
            <tbody>
              <tr className="admin-table__row">
                <td className="admin-table__cell">
                  <label className="admin-form__label" htmlFor="schedule-day">
                    День недели
                  </label>
                  <select id="schedule-day" name="dayOfWeek" className="admin-form__field" defaultValue="1">
                    <option value="0">Воскресенье</option>
                    <option value="1">Понедельник</option>
                    <option value="2">Вторник</option>
                    <option value="3">Среда</option>
                    <option value="4">Четверг</option>
                    <option value="5">Пятница</option>
                    <option value="6">Суббота</option>
                  </select>
                </td>
                <td className="admin-table__cell">
                  <label className="admin-form__label" htmlFor="schedule-start">
                    Начало
                  </label>
                  <input id="schedule-start" name="startTime" type="time" className="admin-form__field" required />
                </td>
                <td className="admin-table__cell">
                  <label className="admin-form__label" htmlFor="schedule-end">
                    Конец
                  </label>
                  <input id="schedule-end" name="endTime" type="time" className="admin-form__field" required />
                </td>
                <td className="admin-table__cell">
                  <label className="admin-form__checkbox">
                    <input name="active" type="checkbox" defaultChecked />
                    <span>Активный интервал</span>
                  </label>
                </td>
                <td className="admin-table__cell">
                  <div className="admin-form__actions">
                    <button type="submit" className="admin-form__submit">
                      Добавить интервал
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
              <th className="admin-table__cell admin-table__cell--head">День</th>
              <th className="admin-table__cell admin-table__cell--head">Интервал</th>
              <th className="admin-table__cell admin-table__cell--head">Активно</th>
              <th className="admin-table__cell admin-table__cell--head">Действия</th>
            </tr>
          </thead>
          <tbody>
            {data.schedules.length === 0 ? (
              <tr className="admin-table__row">
                <td className="admin-table__cell" colSpan={4}>
                  Интервалы графика еще не добавлены.
                </td>
              </tr>
            ) : (
              data.schedules.map((row) => (
                <tr key={row.id} className="admin-table__row">
                  <td className="admin-table__cell">{getScheduleWeekdayLabel(row.dayOfWeek)}</td>
                  <td className="admin-table__cell">
                    {row.startTime} - {row.endTime}
                  </td>
                  <td className="admin-table__cell">
                    <span className="admin-bookings__chip">{row.active ? "Да" : "Нет"}</span>
                  </td>
                  <td className="admin-table__cell">
                    <div className="admin-bookings__actions">
                      <form action={toggleScheduleAction} className="admin-bookings__actions">
                        <input type="hidden" name="scheduleId" value={row.id} />
                        <input type="hidden" name="nextActive" value={String(!row.active)} />
                        <button type="submit" className="admin-bookings__action-button">
                          {row.active ? "Выключить" : "Включить"}
                        </button>
                      </form>
                      <form action={deleteScheduleAction} className="admin-bookings__actions">
                        <input type="hidden" name="scheduleId" value={row.id} />
                        <button type="submit" className="admin-bookings__action-button">
                          Удалить
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <form action={addExceptionAction} className="admin-form">
        <div className="admin-table">
          <table className="admin-table__table">
            <tbody>
              <tr className="admin-table__row">
                <td className="admin-table__cell">
                  <label className="admin-form__label" htmlFor="instructor-exception-date">
                    Дата
                  </label>
                  <input
                    id="instructor-exception-date"
                    name="date"
                    type="date"
                    className="admin-form__field"
                    required
                  />
                </td>
                <td className="admin-table__cell">
                  <label className="admin-form__label" htmlFor="instructor-exception-start">
                    Начало
                  </label>
                  <input
                    id="instructor-exception-start"
                    name="startTime"
                    type="time"
                    className="admin-form__field"
                    required
                  />
                </td>
                <td className="admin-table__cell">
                  <label className="admin-form__label" htmlFor="instructor-exception-end">
                    Конец
                  </label>
                  <input
                    id="instructor-exception-end"
                    name="endTime"
                    type="time"
                    className="admin-form__field"
                    required
                  />
                </td>
                <td className="admin-table__cell">
                  <label className="admin-form__label" htmlFor="instructor-exception-type">
                    Тип
                  </label>
                  <select
                    id="instructor-exception-type"
                    name="type"
                    className="admin-form__field"
                    defaultValue="closed"
                  >
                    <option value="closed">Закрыто</option>
                    <option value="maintenance">Тех. обслуживание</option>
                  </select>
                </td>
                <td className="admin-table__cell">
                  <label className="admin-form__label" htmlFor="instructor-exception-note">
                    Комментарий
                  </label>
                  <input
                    id="instructor-exception-note"
                    name="note"
                    className="admin-form__field"
                    placeholder="Опционально"
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
                  Исключений для тренера пока нет.
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
