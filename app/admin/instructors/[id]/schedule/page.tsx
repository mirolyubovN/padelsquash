import { revalidatePath } from "next/cache";
import { AdminPageShell } from "@/src/components/admin/admin-page-shell";
import { WeeklyScheduleGrid } from "@/src/components/admin/weekly-schedule-grid";
import { assertAdmin } from "@/src/lib/auth/guards";
import { canViewRevenue } from "@/src/lib/auth/roles";
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
  title: "Админ: график тренера | Padel & Squash KZ",
  description: "Расписание тренера, интервалы доступности, исключения и история последних сессий.",
  path: "/admin/instructors/[id]/schedule",
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

export default async function AdminInstructorSchedulePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ week?: string }>;
}) {
  const session = await assertAdmin();
  const canSeeRevenue = canViewRevenue(session.user.role);
  const { id } = await params;
  const { week } = await searchParams;
  const weekStart = parseWeekParam(week);
  const todayWeekStart = getTodayWeekStart();

  const data = await getInstructorSchedulePageData(id);
  const weekSchedule = weekStart
    ? await getInstructorWeekSchedule(id, weekStart)
    : null;

  const sportOptions = data.instructor.sports.map((s) => ({ id: s.sportId, name: s.name }));

  async function saveBaseAction(formData: FormData) {
    "use server";
    await assertAdmin();
    await saveInstructorBaseSchedule({ instructorId: id, formData });
    revalidatePath(`/admin/instructors/${id}/schedule`);
  }

  async function saveWeekAction(formData: FormData) {
    "use server";
    await assertAdmin();
    await saveInstructorWeekSchedule({ instructorId: id, formData });
    revalidatePath(`/admin/instructors/${id}/schedule`);
  }

  async function resetWeekAction(formData: FormData) {
    "use server";
    await assertAdmin();
    const ws = String(formData.get("weekStart") ?? "");
    if (!ws) return;
    await resetInstructorWeekToTemplate({ instructorId: id, weekStart: ws });
    revalidatePath(`/admin/instructors/${id}/schedule`);
  }

  async function addExceptionAction(formData: FormData) {
    "use server";
    await assertAdmin();
    await createInstructorExceptionSimple({ instructorId: id, formData });
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
      description={
        canSeeRevenue
          ? "Недельные интервалы доступности, разовые исключения и последние сессии тренера."
          : "Недельные интервалы доступности и разовые исключения тренера."
      }
      breadcrumbs={[
        { label: "Тренеры", href: "/admin/instructors" },
        { label: data.instructor.name },
        { label: "Расписание" },
      ]}
    >
      <div className="admin-table">
        <table className="admin-table__table">
          <tbody>
            <tr className="admin-table__row">
              <td className="admin-table__cell">
                <strong>Виды спорта и ставки:</strong>{" "}
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
            Базовый шаблон применяется по умолчанию для всех недель. Отдельные недели можно настроить индивидуально.
          </p>
        </div>
        <WeeklyScheduleGrid
          key={weekStart ?? "base"}
          baseSchedule={data.schedules}
          weekStart={weekStart}
          weekSchedule={weekSchedule}
          todayWeekStart={todayWeekStart}
          sportOptions={sportOptions}
          saveBaseAction={saveBaseAction}
          saveWeekAction={saveWeekAction}
          resetWeekAction={resetWeekAction}
        />
      </section>

      <section className="admin-section">
        <div className="admin-section__head">
          <h2 className="admin-section__title">Блокировки</h2>
          <p className="admin-section__description">
            Добавьте дату, когда тренер недоступен. Это закроет его слоты в расписании.
          </p>
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
                  Блокировок для тренера пока нет.
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
              {canSeeRevenue ? <th className="admin-table__cell admin-table__cell--head">Сумма</th> : null}
            </tr>
          </thead>
          <tbody>
            {data.sessions.length === 0 ? (
              <tr className="admin-table__row">
                <td className="admin-table__cell" colSpan={canSeeRevenue ? 7 : 6}>
                  Сессий по этому тренеру пока нет.
                </td>
              </tr>
            ) : (
              data.sessions.map((session) => (
                <tr key={session.id} className="admin-table__row">
                  <td className="admin-table__cell">{session.date}</td>
                  <td className="admin-table__cell">{session.time}</td>
                  <td className="admin-table__cell">{session.serviceName}</td>
                  <td className="admin-table__cell">
                    <div className="admin-bookings__cell-title">{session.customerName}</div>
                    <div className="admin-bookings__cell-sub">{session.customerEmail}</div>
                  </td>
                  <td className="admin-table__cell">{session.courtLabel ?? "—"}</td>
                  <td className="admin-table__cell">{BOOKING_STATUS_LABELS[session.status]}</td>
                  {canSeeRevenue ? (
                    <td className="admin-table__cell">{session.priceTotal.toLocaleString("ru-KZ")} ₸</td>
                  ) : null}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </AdminPageShell>
  );
}
