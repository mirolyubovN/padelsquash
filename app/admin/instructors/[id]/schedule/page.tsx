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
import { t } from "@/src/lib/i18n";

export const metadata = buildPageMetadata({
  title: "Админ: график тренера | Padel & Squash KZ",
  description: "Расписание тренера, интервалы доступности, исключения и история последних сессий.",
  path: "/admin/instructors/[id]/schedule",
  noIndex: true,
});

export const dynamic = "force-dynamic";

const BOOKING_STATUS_LABELS = {
  pending_payment: t("admin.bookingStatuses.pendingPayment"),
  confirmed: t("admin.bookingStatuses.confirmed"),
  cancelled: t("admin.bookingStatuses.cancelled"),
  completed: t("admin.bookingStatuses.completed"),
  no_show: t("admin.bookingStatuses.noShow"),
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
      title={t("admin.instructorSchedule.title", { name: data.instructor.name })}
      description={
        canSeeRevenue
          ? t("admin.instructorSchedule.descriptionWithRevenue")
          : t("admin.instructorSchedule.description")
      }
      breadcrumbs={[
        { label: t("admin.instructors.title"), href: "/admin/instructors" },
        { label: data.instructor.name },
        { label: t("admin.instructorSchedule.breadcrumb") },
      ]}
    >
      <div className="admin-table">
        <table className="admin-table__table">
          <tbody>
            <tr className="admin-table__row">
              <td className="admin-table__cell">
                <strong>{t("admin.instructorSchedule.sportsAndRatesLabel")}</strong>{" "}
                {data.instructor.sports.length > 0
                  ? data.instructor.sports
                      .map((sport) => t("admin.instructorSchedule.sportRate", { sport: sport.name, price: Number(sport.pricePerHour).toLocaleString("ru-KZ") }))
                      .join(", ")
                  : "—"}
              </td>
              <td className="admin-table__cell">
                <strong>{t("admin.instructorSchedule.bioLabel")}</strong> {data.instructor.bio ?? "—"}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <section className="admin-section">
        <div className="admin-section__head">
          <h2 className="admin-section__title">{t("admin.instructorSchedule.availabilityTitle")}</h2>
          <p className="admin-section__description">
            {t("admin.instructorSchedule.availabilityDescription")}
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
          <h2 className="admin-section__title">{t("admin.instructorSchedule.blocksTitle")}</h2>
          <p className="admin-section__description">
            {t("admin.instructorSchedule.blocksDescription")}
          </p>
        </div>
        <form action={addExceptionAction} className="admin-form">
          <div className="admin-table">
            <table className="admin-table__table">
              <tbody>
                <tr className="admin-table__row">
                  <td className="admin-table__cell">
                    <label className="admin-form__label" htmlFor="instructor-exception-date">
                      {t("admin.common.fields.date")}
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
                      {t("admin.common.fields.start")}
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
                      {t("admin.common.fields.end")}
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
                      {t("admin.common.fields.comment")}
                    </label>
                    <input
                      id="instructor-exception-note"
                      name="note"
                      className="admin-form__field"
                      placeholder={t("admin.common.placeholders.optional")}
                    />
                  </td>
                  <td className="admin-table__cell">
                    <div className="admin-form__actions">
                      <button type="submit" className="admin-form__submit">
                        {t("admin.common.add")}
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
              <th className="admin-table__cell admin-table__cell--head">{t("admin.common.table.date")}</th>
              <th className="admin-table__cell admin-table__cell--head">{t("admin.common.table.time")}</th>
              <th className="admin-table__cell admin-table__cell--head">{t("admin.common.table.comment")}</th>
              <th className="admin-table__cell admin-table__cell--head">{t("admin.common.table.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {data.exceptions.length === 0 ? (
              <tr className="admin-table__row">
                <td className="admin-table__cell" colSpan={4}>
                  {t("admin.instructorSchedule.noBlocks")}
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
                        {t("admin.common.delete")}
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
              <th className="admin-table__cell admin-table__cell--head">{t("admin.common.table.date")}</th>
              <th className="admin-table__cell admin-table__cell--head">{t("admin.common.table.time")}</th>
              <th className="admin-table__cell admin-table__cell--head">{t("admin.common.table.service")}</th>
              <th className="admin-table__cell admin-table__cell--head">{t("admin.common.table.customer")}</th>
              <th className="admin-table__cell admin-table__cell--head">{t("admin.common.table.court")}</th>
              <th className="admin-table__cell admin-table__cell--head">{t("admin.common.table.status")}</th>
              {canSeeRevenue ? <th className="admin-table__cell admin-table__cell--head">{t("admin.common.table.amount")}</th> : null}
            </tr>
          </thead>
          <tbody>
            {data.sessions.length === 0 ? (
              <tr className="admin-table__row">
                <td className="admin-table__cell" colSpan={canSeeRevenue ? 7 : 6}>
                  {t("admin.instructorSchedule.noSessions")}
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
