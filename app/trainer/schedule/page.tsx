import { revalidatePath } from "next/cache";
import { PageHero } from "@/src/components/page-hero";
import { assertTrainer, requireTrainer } from "@/src/lib/auth/guards";
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
import { buildPageMetadata } from "@/src/lib/seo/metadata";

export const metadata = buildPageMetadata({
  title: "Кабинет тренера: расписание | Padel & Squash KZ",
  description: "Управление личным расписанием тренера: интервалы доступности и исключения.",
  path: "/trainer/schedule",
  noIndex: true,
});

export const dynamic = "force-dynamic";

const BOOKING_STATUS_LABELS = {
  pending_payment: "Ожидает оплаты",
  confirmed: "Подтверждено",
  cancelled: "Отменено",
  completed: "Завершено",
  no_show: "Неявка",
} as const;

export default async function TrainerSchedulePage() {
  const session = await requireTrainer("/trainer/schedule");
  const instructorId = session.user.instructorId;

  if (!instructorId) {
    throw new Error("Профиль тренера не привязан.");
  }

  const data = await getInstructorSchedulePageData(instructorId);

  async function addScheduleAction(formData: FormData) {
    "use server";
    const trainer = await assertTrainer();
    if (!trainer.user.instructorId) {
      throw new Error("Профиль тренера не привязан.");
    }
    await addInstructorScheduleFromForm({ instructorId: trainer.user.instructorId, formData });
    revalidatePath("/trainer/schedule");
  }

  async function toggleScheduleAction(formData: FormData) {
    "use server";
    const trainer = await assertTrainer();
    if (!trainer.user.instructorId) {
      throw new Error("Профиль тренера не привязан.");
    }
    const scheduleId = String(formData.get("scheduleId") ?? "");
    const nextActive = String(formData.get("nextActive") ?? "") === "true";
    if (!scheduleId) {
      throw new Error("scheduleId обязателен");
    }
    await setInstructorScheduleActive({ instructorId: trainer.user.instructorId, scheduleId, active: nextActive });
    revalidatePath("/trainer/schedule");
  }

  async function deleteScheduleAction(formData: FormData) {
    "use server";
    const trainer = await assertTrainer();
    if (!trainer.user.instructorId) {
      throw new Error("Профиль тренера не привязан.");
    }
    const scheduleId = String(formData.get("scheduleId") ?? "");
    if (!scheduleId) {
      throw new Error("scheduleId обязателен");
    }
    await deleteInstructorSchedule({ instructorId: trainer.user.instructorId, scheduleId });
    revalidatePath("/trainer/schedule");
  }

  async function addExceptionAction(formData: FormData) {
    "use server";
    const trainer = await assertTrainer();
    if (!trainer.user.instructorId) {
      throw new Error("Профиль тренера не привязан.");
    }
    await createInstructorExceptionFromForm({ instructorId: trainer.user.instructorId, formData });
    revalidatePath("/trainer/schedule");
  }

  async function deleteExceptionAction(formData: FormData) {
    "use server";
    const trainer = await assertTrainer();
    if (!trainer.user.instructorId) {
      throw new Error("Профиль тренера не привязан.");
    }
    const exceptionId = String(formData.get("exceptionId") ?? "");
    if (!exceptionId) {
      throw new Error("exceptionId обязателен");
    }
    await deleteScheduleExceptionForResource({
      exceptionId,
      resourceType: "instructor",
      resourceId: trainer.user.instructorId,
    });
    revalidatePath("/trainer/schedule");
  }

  return (
    <div className="account-page">
      <PageHero
        eyebrow="Кабинет тренера"
        title={`Мое расписание: ${data.instructor.name}`}
        description="Управляйте доступными интервалами и исключениями без лишних разделов админ-панели."
      />

      <div className="admin-table">
        <table className="admin-table__table">
          <tbody>
            <tr className="admin-table__row">
              <td className="admin-table__cell">
                <strong>Виды спорта и ставка:</strong>{" "}
                {data.instructor.sports.length > 0
                  ? data.instructor.sports
                      .map((sport) => `${sport.name}: ${Number(sport.pricePerHour).toLocaleString("ru-KZ")} ₸ / час`)
                      .join(", ")
                  : "—"}
              </td>
              <td className="admin-table__cell">
                <strong>Описание:</strong> {data.instructor.bio ?? "—"}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <form action={addScheduleAction} className="admin-form">
        <div className="admin-table">
          <table className="admin-table__table">
            <tbody>
              <tr className="admin-table__row">
                <td className="admin-table__cell">
                  <label className="admin-form__label" htmlFor="trainer-schedule-day">
                    День недели
                  </label>
                  <select id="trainer-schedule-day" name="dayOfWeek" className="admin-form__field" defaultValue="1">
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
                  <label className="admin-form__label" htmlFor="trainer-schedule-start">
                    Начало
                  </label>
                  <input
                    id="trainer-schedule-start"
                    name="startTime"
                    type="time"
                    className="admin-form__field"
                    required
                  />
                </td>
                <td className="admin-table__cell">
                  <label className="admin-form__label" htmlFor="trainer-schedule-end">
                    Конец
                  </label>
                  <input
                    id="trainer-schedule-end"
                    name="endTime"
                    type="time"
                    className="admin-form__field"
                    required
                  />
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
                  <label className="admin-form__label" htmlFor="trainer-exception-date">
                    Дата
                  </label>
                  <input id="trainer-exception-date" name="date" type="date" className="admin-form__field" required />
                </td>
                <td className="admin-table__cell">
                  <label className="admin-form__label" htmlFor="trainer-exception-start">
                    Начало
                  </label>
                  <input
                    id="trainer-exception-start"
                    name="startTime"
                    type="time"
                    className="admin-form__field"
                    required
                  />
                </td>
                <td className="admin-table__cell">
                  <label className="admin-form__label" htmlFor="trainer-exception-end">
                    Конец
                  </label>
                  <input
                    id="trainer-exception-end"
                    name="endTime"
                    type="time"
                    className="admin-form__field"
                    required
                  />
                </td>
                <td className="admin-table__cell">
                  <label className="admin-form__label" htmlFor="trainer-exception-type">
                    Тип
                  </label>
                  <select id="trainer-exception-type" name="type" className="admin-form__field" defaultValue="closed">
                    <option value="closed">Закрыто</option>
                    <option value="maintenance">Тех. обслуживание</option>
                  </select>
                </td>
                <td className="admin-table__cell">
                  <label className="admin-form__label" htmlFor="trainer-exception-note">
                    Комментарий
                  </label>
                  <input
                    id="trainer-exception-note"
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

      <div className="admin-table">
        <table className="admin-table__table">
          <thead>
            <tr className="admin-table__row">
              <th className="admin-table__cell admin-table__cell--head">Дата</th>
              <th className="admin-table__cell admin-table__cell--head">Время</th>
              <th className="admin-table__cell admin-table__cell--head">Услуга</th>
              <th className="admin-table__cell admin-table__cell--head">Клиент</th>
              <th className="admin-table__cell admin-table__cell--head">Корт</th>
              <th className="admin-table__cell admin-table__cell--head">Статус</th>
            </tr>
          </thead>
          <tbody>
            {data.sessions.length === 0 ? (
              <tr className="admin-table__row">
                <td className="admin-table__cell" colSpan={6}>
                  Сессий по вашему профилю пока нет.
                </td>
              </tr>
            ) : (
              data.sessions.map((sessionRow) => (
                <tr key={sessionRow.id} className="admin-table__row">
                  <td className="admin-table__cell">{sessionRow.date}</td>
                  <td className="admin-table__cell">{sessionRow.time}</td>
                  <td className="admin-table__cell">{sessionRow.serviceName}</td>
                  <td className="admin-table__cell">
                    <div className="admin-bookings__cell-title">{sessionRow.customerName}</div>
                    <div className="admin-bookings__cell-sub">{sessionRow.customerEmail}</div>
                  </td>
                  <td className="admin-table__cell">{sessionRow.courtLabel ?? "—"}</td>
                  <td className="admin-table__cell">{BOOKING_STATUS_LABELS[sessionRow.status]}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
