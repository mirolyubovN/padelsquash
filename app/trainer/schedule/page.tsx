import { revalidatePath } from "next/cache";
import { PageHero } from "@/src/components/page-hero";
import { WeeklyScheduleGrid } from "@/src/components/admin/weekly-schedule-grid";
import { assertTrainer, requireTrainer } from "@/src/lib/auth/guards";
import {
  createInstructorExceptionSimple,
  deleteScheduleExceptionForResource,
  getInstructorSchedulePageData,
  getInstructorWeekSchedule,
  resetInstructorWeekToTemplate,
  saveInstructorBaseSchedule,
  saveInstructorWeekSchedule,
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

function getTodayWeekStart(): string {
  const now = new Date();
  const almaty = new Date(now.getTime() + 5 * 60 * 60 * 1000);
  const day = almaty.getUTCDay();
  almaty.setUTCDate(almaty.getUTCDate() + (day === 0 ? -6 : 1 - day));
  return almaty.toISOString().split("T")[0];
}

function parseWeekParam(week: string | undefined): string | null {
  if (!week || !/^\d{4}-\d{2}-\d{2}$/.test(week)) return null;
  const d = new Date(week + "T12:00:00Z");
  if (isNaN(d.getTime()) || d.getUTCDay() !== 1) return null;
  return week;
}

export default async function TrainerSchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const session = await requireTrainer("/trainer/schedule");
  const instructorId = session.user.instructorId;

  if (!instructorId) {
    throw new Error("Профиль тренера не привязан.");
  }

  const { week } = await searchParams;
  const weekStart = parseWeekParam(week);
  const todayWeekStart = getTodayWeekStart();

  const data = await getInstructorSchedulePageData(instructorId);
  const weekSchedule = weekStart
    ? await getInstructorWeekSchedule(instructorId, weekStart)
    : null;

  async function saveBaseAction(formData: FormData) {
    "use server";
    const trainer = await assertTrainer();
    if (!trainer.user.instructorId) {
      throw new Error("Профиль тренера не привязан.");
    }
    await saveInstructorBaseSchedule({ instructorId: trainer.user.instructorId, formData });
    revalidatePath("/trainer/schedule");
  }

  async function saveWeekAction(formData: FormData) {
    "use server";
    const trainer = await assertTrainer();
    if (!trainer.user.instructorId) {
      throw new Error("Профиль тренера не привязан.");
    }
    await saveInstructorWeekSchedule({ instructorId: trainer.user.instructorId, formData });
    revalidatePath("/trainer/schedule");
  }

  async function resetWeekAction(formData: FormData) {
    "use server";
    const trainer = await assertTrainer();
    if (!trainer.user.instructorId) {
      throw new Error("Профиль тренера не привязан.");
    }
    const ws = String(formData.get("weekStart") ?? "");
    if (!ws) return;
    await resetInstructorWeekToTemplate({ instructorId: trainer.user.instructorId, weekStart: ws });
    revalidatePath("/trainer/schedule");
  }

  async function addExceptionAction(formData: FormData) {
    "use server";
    const trainer = await assertTrainer();
    if (!trainer.user.instructorId) {
      throw new Error("Профиль тренера не привязан.");
    }
    await createInstructorExceptionSimple({ instructorId: trainer.user.instructorId, formData });
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

      <section className="admin-section">
        <div className="admin-section__head">
          <h2 className="admin-section__title">Расписание доступности</h2>
          <p className="admin-section__description">
            Базовый шаблон применяется по умолчанию для всех недель. Вы можете настроить отдельные недели.
          </p>
        </div>
        <WeeklyScheduleGrid
          key={weekStart ?? "base"}
          baseSchedule={data.schedules}
          weekStart={weekStart}
          weekSchedule={weekSchedule}
          todayWeekStart={todayWeekStart}
          sportOptions={[]}
          saveBaseAction={saveBaseAction}
          saveWeekAction={saveWeekAction}
          resetWeekAction={resetWeekAction}
        />
      </section>

      <section className="admin-section">
        <div className="admin-section__head">
          <h2 className="admin-section__title">Выходные и недоступность</h2>
          <p className="admin-section__description">
            Добавьте дату, когда вы недоступны. Это закроет ваши слоты в расписании на этот день/время.
          </p>
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
                        Добавить
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </form>
      </section>

      <div className="admin-table">
        <table className="admin-table__table">
          <thead>
            <tr className="admin-table__row">
              <th className="admin-table__cell admin-table__cell--head">Дата</th>
              <th className="admin-table__cell admin-table__cell--head">Время</th>
              <th className="admin-table__cell admin-table__cell--head">Комментарий</th>
              <th className="admin-table__cell admin-table__cell--head">Действия</th>
            </tr>
          </thead>
          <tbody>
            {data.exceptions.length === 0 ? (
              <tr className="admin-table__row">
                <td className="admin-table__cell" colSpan={4}>
                  Блокировок пока нет.
                </td>
              </tr>
            ) : (
              data.exceptions.map((row) => (
                <tr key={row.id} className="admin-table__row">
                  <td className="admin-table__cell">{row.date}</td>
                  <td className="admin-table__cell">
                    {row.startTime} – {row.endTime}
                  </td>
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
