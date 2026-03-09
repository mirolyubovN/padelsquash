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
import { getTrainerEarnings } from "@/src/lib/trainer/earnings";
import { cancelBookingWithRefundInTx } from "@/src/lib/bookings/operations";
import { notifyBookingCancelled } from "@/src/lib/notifications/bookings";
import { logAuditEvent } from "@/src/lib/audit/log";
import { prisma } from "@/src/lib/prisma";
import { buildPageMetadata } from "@/src/lib/seo/metadata";
import { TrainerCancelBookingForm } from "@/src/components/trainer/trainer-cancel-booking-form";
import Link from "next/link";

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

function getEarningsDateRange(period: string): { dateFrom: string; dateTo: string; label: string } {
  const now = new Date();
  const almaty = new Date(now.getTime() + 5 * 60 * 60 * 1000);
  const todayIso = almaty.toISOString().split("T")[0];

  if (period === "week") {
    const day = almaty.getUTCDay();
    const monday = new Date(almaty);
    monday.setUTCDate(almaty.getUTCDate() + (day === 0 ? -6 : 1 - day));
    const sunday = new Date(monday);
    sunday.setUTCDate(monday.getUTCDate() + 6);
    return {
      dateFrom: monday.toISOString().split("T")[0],
      dateTo: sunday.toISOString().split("T")[0],
      label: "Эта неделя",
    };
  }

  // Default: current month
  const year = almaty.getUTCFullYear();
  const month = almaty.getUTCMonth();
  const firstDay = new Date(Date.UTC(year, month, 1));
  const lastDay = new Date(Date.UTC(year, month + 1, 0));
  return {
    dateFrom: firstDay.toISOString().split("T")[0],
    dateTo: lastDay.toISOString().split("T")[0],
    label: `${almaty.toLocaleString("ru-RU", { month: "long", year: "numeric", timeZone: "Asia/Almaty" })}`,
  };
}

export default async function TrainerSchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string; period?: string }>;
}) {
  const session = await requireTrainer("/trainer/schedule");
  const instructorId = session.user.instructorId;

  if (!instructorId) {
    throw new Error("Профиль тренера не привязан.");
  }

  const { week, period } = await searchParams;
  const weekStart = parseWeekParam(week);
  const todayWeekStart = getTodayWeekStart();
  const earningsPeriod = period === "week" ? "week" : "month";
  const { dateFrom, dateTo, label: periodLabel } = getEarningsDateRange(earningsPeriod);

  const [data, earnings] = await Promise.all([
    getInstructorSchedulePageData(instructorId),
    getTrainerEarnings(instructorId, dateFrom, dateTo),
  ]);

  const weekSchedule = weekStart
    ? await getInstructorWeekSchedule(instructorId, weekStart)
    : null;

  const nowIso = new Date().toISOString();

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

  async function cancelSessionAction(formData: FormData) {
    "use server";
    const trainer = await assertTrainer();
    if (!trainer.user.instructorId) {
      throw new Error("Профиль тренера не привязан.");
    }
    const bookingId = String(formData.get("bookingId") ?? "");
    const cancellationReason = String(formData.get("cancellationReason") ?? "").trim();
    if (!bookingId) throw new Error("bookingId обязателен");
    if (!cancellationReason) throw new Error("Укажите причину отмены");

    // Security: verify booking has this instructor as a resource
    const booking = await prisma.booking.findFirst({
      where: {
        id: bookingId,
        resources: {
          some: { resourceType: "instructor", resourceId: trainer.user.instructorId },
        },
        status: { in: ["confirmed", "pending_payment"] },
        startAt: { gt: new Date() },
      },
      select: { id: true },
    });
    if (!booking) {
      throw new Error("Бронирование не найдено или недоступно для отмены");
    }

    const updated = await prisma.$transaction((tx) =>
      cancelBookingWithRefundInTx({
        tx,
        bookingId,
        cancelledBy: "trainer",
        cancellationReason,
      }),
    );

    await notifyBookingCancelled({ bookingId: updated.id, cancelledBy: "trainer" });
    await logAuditEvent({
      actorUserId: trainer.user.id,
      action: "booking.cancel",
      entityType: "booking",
      entityId: updated.id,
      detail: { cancelledBy: "trainer", reason: cancellationReason },
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

      {/* Earnings section */}
      <section className="admin-section">
        <div className="admin-section__head">
          <h2 className="admin-section__title">Мои заработки</h2>
          <div className="admin-calendar__view-toggle">
            <Link
              href="/trainer/schedule?period=month"
              className={`admin-bookings__action-button${earningsPeriod === "month" ? " admin-bookings__action-button--active" : ""}`}
            >
              Этот месяц
            </Link>
            <Link
              href="/trainer/schedule?period=week"
              className={`admin-bookings__action-button${earningsPeriod === "week" ? " admin-bookings__action-button--active" : ""}`}
            >
              Эта неделя
            </Link>
          </div>
        </div>

        <div className="trainer-earnings__summary">
          <div className="trainer-earnings__card">
            <div className="trainer-earnings__card-label">{periodLabel}</div>
            <div className="trainer-earnings__card-total">{earnings.totalKzt}</div>
            <div className="trainer-earnings__card-count">{earnings.sessionCount} завершённых сессий</div>
          </div>
        </div>

        {earnings.rows.length > 0 ? (
          <div className="admin-table">
            <table className="admin-table__table">
              <thead>
                <tr className="admin-table__row">
                  <th className="admin-table__cell admin-table__cell--head">Дата</th>
                  <th className="admin-table__cell admin-table__cell--head">Время</th>
                  <th className="admin-table__cell admin-table__cell--head">Услуга</th>
                  <th className="admin-table__cell admin-table__cell--head">Клиент</th>
                  <th className="admin-table__cell admin-table__cell--head">Сумма</th>
                </tr>
              </thead>
              <tbody>
                {earnings.rows.map((row) => (
                  <tr key={row.bookingId} className="admin-table__row">
                    <td className="admin-table__cell">{row.date}</td>
                    <td className="admin-table__cell">{row.time}</td>
                    <td className="admin-table__cell">{row.serviceName}</td>
                    <td className="admin-table__cell">{row.customerName}</td>
                    <td className="admin-table__cell">{row.amountKzt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="admin-section__description">Нет завершённых сессий за выбранный период.</p>
        )}
      </section>

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
              <th className="admin-table__cell admin-table__cell--head">Действия</th>
            </tr>
          </thead>
          <tbody>
            {data.sessions.length === 0 ? (
              <tr className="admin-table__row">
                <td className="admin-table__cell" colSpan={7}>
                  Сессий по вашему профилю пока нет.
                </td>
              </tr>
            ) : (
              data.sessions.map((sessionRow) => {
                const isFuture = sessionRow.startAtIso > nowIso;
                const canCancel =
                  isFuture &&
                  (sessionRow.status === "confirmed" || sessionRow.status === "pending_payment");
                return (
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
                    <td className="admin-table__cell">
                      {canCancel ? (
                        <TrainerCancelBookingForm
                          bookingId={sessionRow.id}
                          sessionLabel={`${sessionRow.date}, ${sessionRow.time}`}
                          cancelAction={cancelSessionAction}
                        />
                      ) : (
                        <span className="admin-bookings__no-actions">—</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
