import Link from "next/link";
import { revalidatePath } from "next/cache";
import { EventCreateConfirmation } from "@/src/components/admin/event-create-confirmation";
import { EventCourtPicker } from "@/src/components/admin/event-court-picker";
import { AdminPageShell } from "@/src/components/admin/admin-page-shell";
import { AdminEditModal } from "@/src/components/admin/admin-edit-modal";
import { assertAdmin } from "@/src/lib/auth/guards";
import {
  cancelEventRegistrationByAdmin,
  createEventsFromForm,
  getAdminEventOptions,
  getAdminEvents,
  setEventStatus,
  updateEventFromForm,
} from "@/src/lib/events/service";
import { formatDateInVenueTimezone, formatTimeInVenueTimezone, toVenueIsoDate } from "@/src/lib/time/venue-timezone";
import { buildPageMetadata } from "@/src/lib/seo/metadata";
import { t } from "@/src/lib/i18n";

export const metadata = buildPageMetadata({
  title: "Админ: события | Padel & Squash KZ",
  description: "Клубные дни, групповые тренировки и recurring events.",
  path: "/admin/events",
  noIndex: true,
});

export const dynamic = "force-dynamic";

function eventDateTimeLabel(startAt: Date, endAt: Date): string {
  return `${formatDateInVenueTimezone(startAt)}, ${formatTimeInVenueTimezone(startAt)}-${formatTimeInVenueTimezone(endAt)}`;
}

function statusLabel(status: string): string {
  if (status === "published") return t("admin.events.status.published");
  if (status === "draft") return t("admin.events.status.draft");
  if (status === "cancelled") return t("admin.events.status.cancelled");
  return status;
}

function eventDurationMin(startAt: Date, endAt: Date): number {
  return Math.max(30, Math.round((endAt.getTime() - startAt.getTime()) / 60000));
}

function revalidateEvents() {
  revalidatePath("/admin/events");
  revalidatePath("/events");
  revalidatePath("/account");
  revalidatePath("/account/bookings");
}

export default async function AdminEventsPage() {
  await assertAdmin();
  const [events, options] = await Promise.all([getAdminEvents(), getAdminEventOptions()]);
  const today = toVenueIsoDate(new Date());

  async function createAction(formData: FormData) {
    "use server";
    const actionSession = await assertAdmin();
    await createEventsFromForm(formData, actionSession.user.id);
    revalidateEvents();
  }

  async function statusAction(formData: FormData) {
    "use server";
    const actionSession = await assertAdmin();
    const eventId = String(formData.get("eventId") ?? "");
    const statusRaw = String(formData.get("status") ?? "");
    const status = statusRaw === "draft" || statusRaw === "published" || statusRaw === "cancelled" ? statusRaw : null;
    if (!eventId || !status) {
      throw new Error("Некорректный статус события");
    }
    await setEventStatus({ eventId, status, actorUserId: actionSession.user.id });
    revalidateEvents();
  }

  async function updateAction(formData: FormData) {
    "use server";
    await assertAdmin();
    await updateEventFromForm(formData);
    revalidateEvents();
  }

  async function cancelParticipantAction(formData: FormData) {
    "use server";
    const actionSession = await assertAdmin();
    const registrationId = String(formData.get("registrationId") ?? "");
    if (!registrationId) {
      throw new Error("Некорректная запись на событие");
    }
    await cancelEventRegistrationByAdmin({ registrationId, actorUserId: actionSession.user.id });
    revalidateEvents();
  }

  return (
    <AdminPageShell
      title={t("admin.events.title")}
      description={t("admin.events.description")}
    >
      <section className="admin-section">
        <div className="admin-section__head">
          <h2 className="admin-section__title">{t("admin.events.addTitle")}</h2>
          <p className="admin-section__description">
            {t("admin.events.addDescription")}
          </p>
        </div>

        <form action={createAction} className="admin-form admin-form--panel">
          <input type="hidden" name="category" value="group_training" />
          <div className="admin-form__panel-grid">
            <div className="admin-form__group">
              <label className="admin-form__label" htmlFor="event-title">{t("admin.common.fields.name")}</label>
              <input id="event-title" name="title" className="admin-form__field" placeholder={t("admin.events.placeholders.title")} required />
            </div>
            <div className="admin-form__group">
              <label className="admin-form__label" htmlFor="event-description">{t("admin.common.fields.description")}</label>
              <textarea id="event-description" name="description" className="admin-form__field admin-form__textarea" placeholder={t("admin.events.placeholders.description")} />
            </div>
            <div className="admin-form__group">
              <label className="admin-form__label" htmlFor="event-level">{t("admin.events.fields.level")}</label>
              <input id="event-level" name="level" className="admin-form__field" placeholder={t("admin.events.placeholders.level")} />
            </div>
            <EventCourtPicker
              sports={options.sports}
              courts={options.courts}
              instructors={options.instructors}
              idPrefix="event-create"
            />
            <div className="admin-form__group">
              <label className="admin-form__label" htmlFor="event-location">{t("admin.events.fields.location")}</label>
              <select id="event-location" name="locationId" className="admin-form__field" defaultValue={options.locations[0]?.id ?? ""}>
                <option value="">{t("admin.events.locationNone")}</option>
                {options.locations.map((location) => (
                  <option key={location.id} value={location.id}>{location.name}</option>
                ))}
              </select>
            </div>
            <div className="admin-form__group">
              <label className="admin-form__label" htmlFor="event-date">{t("admin.events.fields.firstDate")}</label>
              <input id="event-date" name="date" type="date" className="admin-form__field" defaultValue={today} required />
            </div>
            <div className="admin-form__group">
              <label className="admin-form__label" htmlFor="event-start-time">{t("admin.events.fields.startTime")}</label>
              <input id="event-start-time" name="startTime" type="time" step="900" className="admin-form__field" defaultValue="19:00" required />
            </div>
            <div className="admin-form__group">
              <label className="admin-form__label" htmlFor="event-duration">{t("admin.events.fields.durationMinutes")}</label>
              <input id="event-duration" name="durationMin" type="number" min="30" max="480" step="15" className="admin-form__field" defaultValue={90} required />
            </div>
            <div className="admin-form__group">
              <label className="admin-form__label" htmlFor="event-price">{t("admin.events.fields.price")}</label>
              <input id="event-price" name="priceKzt" type="number" min="0" step="1" className="admin-form__field" defaultValue={0} required />
            </div>
            <div className="admin-form__group">
              <label className="admin-form__label" htmlFor="event-capacity">{t("admin.events.fields.capacity")}</label>
              <input id="event-capacity" name="capacity" type="number" min="1" max="200" step="1" className="admin-form__field" defaultValue={8} required />
            </div>
            <div className="admin-form__group">
              <label className="admin-form__label" htmlFor="event-recurrence">{t("admin.events.fields.recurrence")}</label>
              <select id="event-recurrence" name="recurrence" className="admin-form__field" defaultValue="none">
                <option value="none">{t("admin.events.recurrence.once")}</option>
                <option value="weekly">{t("admin.events.recurrence.weekly")}</option>
              </select>
            </div>
            <div className="admin-form__group">
              <label className="admin-form__label" htmlFor="event-repeat-count">{t("admin.events.fields.repeatWeeks")}</label>
              <input id="event-repeat-count" name="repeatCount" type="number" min="1" max="52" step="1" className="admin-form__field" defaultValue={4} />
            </div>
            <div className="admin-form__group">
              <label className="admin-form__checkbox">
                <input name="publish" type="checkbox" defaultChecked />
                <span>{t("admin.events.publishImmediately")}</span>
              </label>
            </div>
          </div>
          <div className="admin-form__actions">
            <button type="submit" className="admin-form__submit">{t("admin.events.createSubmit")}</button>
          </div>
          <EventCreateConfirmation />
        </form>
      </section>

      <div className="admin-table">
        <table className="admin-table__table">
          <thead>
            <tr className="admin-table__row">
              <th className="admin-table__cell admin-table__cell--head">{t("admin.events.table.event")}</th>
              <th className="admin-table__cell admin-table__cell--head">{t("admin.common.table.date")}</th>
              <th className="admin-table__cell admin-table__cell--head">{t("admin.events.table.priceSeats")}</th>
              <th className="admin-table__cell admin-table__cell--head">{t("admin.common.table.status")}</th>
              <th className="admin-table__cell admin-table__cell--head">{t("admin.common.table.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {events.length === 0 ? (
              <tr className="admin-table__row">
                <td className="admin-table__cell" colSpan={5}>{t("admin.events.empty")}</td>
              </tr>
            ) : (
              events.map((event) => (
                <tr key={event.id} className="admin-table__row">
                  <td className="admin-table__cell">
                    <div className="admin-bookings__cell-title">{event.title}</div>
                    <div className="admin-bookings__cell-sub">
                      {[
                        event.level,
                        event.sportName,
                        event.courtNames.length > 0 ? t("admin.events.courtsList", { courts: event.courtNames.join(", ") }) : null,
                        event.instructorName,
                      ].filter(Boolean).join(" · ")}
                    </div>
                  </td>
                  <td className="admin-table__cell">{eventDateTimeLabel(event.startsAt, event.endsAt)}</td>
                  <td className="admin-table__cell">
                    <div>{event.priceKzt.toLocaleString("ru-KZ")} ₸</div>
                    <div className="admin-bookings__cell-sub">
                      {t("admin.events.seatsSummary", { confirmed: event.confirmedCount, capacity: event.capacity, spotsLeft: event.spotsLeft })}
                    </div>
                  </td>
                  <td className="admin-table__cell">
                    <span className={`admin-status-badge ${event.status === "published" ? "admin-status-badge--active" : "admin-status-badge--inactive"}`}>
                      <span className="admin-status-badge__dot" aria-hidden="true" />
                      {statusLabel(event.status)}
                    </span>
                  </td>
                  <td className="admin-table__cell">
                    <div className="admin-bookings__actions">
                      <AdminEditModal triggerLabel={t("admin.common.edit")} title={t("admin.events.editTitle", { title: event.title })}>
                        <form action={updateAction} className="admin-form">
                          <input type="hidden" name="eventId" value={event.id} />
                          <input type="hidden" name="category" value={event.category} />
                          <div className="admin-form__panel-grid">
                            <div className="admin-form__group">
                              <label className="admin-form__label" htmlFor={`event-title-${event.id}`}>{t("admin.common.fields.name")}</label>
                              <input id={`event-title-${event.id}`} name="title" className="admin-form__field" defaultValue={event.title} required />
                            </div>
                            <div className="admin-form__group">
                              <label className="admin-form__label" htmlFor={`event-description-${event.id}`}>{t("admin.common.fields.description")}</label>
                              <textarea id={`event-description-${event.id}`} name="description" className="admin-form__field admin-form__textarea" defaultValue={event.description ?? ""} />
                            </div>
                            <div className="admin-form__group">
                              <label className="admin-form__label" htmlFor={`event-level-${event.id}`}>{t("admin.events.fields.level")}</label>
                              <input id={`event-level-${event.id}`} name="level" className="admin-form__field" defaultValue={event.level ?? ""} />
                            </div>
                            <EventCourtPicker
                              sports={options.sports}
                              courts={options.courts}
                              instructors={options.instructors}
                              defaultSportId={event.sportId}
                              defaultCourtIds={event.courtIds}
                              defaultInstructorId={event.instructorId}
                              idPrefix={`event-edit-${event.id}`}
                            />
                            <div className="admin-form__group">
                              <label className="admin-form__label" htmlFor={`event-location-${event.id}`}>{t("admin.events.fields.location")}</label>
                              <select id={`event-location-${event.id}`} name="locationId" className="admin-form__field" defaultValue={event.locationId ?? ""}>
                                <option value="">{t("admin.events.locationNone")}</option>
                                {options.locations.map((location) => (
                                  <option key={location.id} value={location.id}>{location.name}</option>
                                ))}
                              </select>
                            </div>
                            <div className="admin-form__group">
                              <label className="admin-form__label" htmlFor={`event-date-${event.id}`}>{t("admin.common.fields.date")}</label>
                              <input id={`event-date-${event.id}`} name="date" type="date" className="admin-form__field" defaultValue={toVenueIsoDate(event.startsAt)} required />
                            </div>
                            <div className="admin-form__group">
                              <label className="admin-form__label" htmlFor={`event-time-${event.id}`}>{t("admin.events.fields.startTime")}</label>
                              <input id={`event-time-${event.id}`} name="startTime" type="time" step="900" className="admin-form__field" defaultValue={formatTimeInVenueTimezone(event.startsAt)} required />
                            </div>
                            <div className="admin-form__group">
                              <label className="admin-form__label" htmlFor={`event-duration-${event.id}`}>{t("admin.events.fields.durationMinutes")}</label>
                              <input id={`event-duration-${event.id}`} name="durationMin" type="number" min="30" max="480" step="15" className="admin-form__field" defaultValue={eventDurationMin(event.startsAt, event.endsAt)} required />
                            </div>
                            <div className="admin-form__group">
                              <label className="admin-form__label" htmlFor={`event-price-${event.id}`}>{t("admin.events.fields.price")}</label>
                              <input id={`event-price-${event.id}`} name="priceKzt" type="number" min="0" step="1" className="admin-form__field" defaultValue={event.priceKzt} required />
                            </div>
                            <div className="admin-form__group">
                              <label className="admin-form__label" htmlFor={`event-capacity-${event.id}`}>{t("admin.events.fields.capacity")}</label>
                              <input id={`event-capacity-${event.id}`} name="capacity" type="number" min={event.confirmedCount} max="200" step="1" className="admin-form__field" defaultValue={event.capacity} required />
                            </div>
                            <div className="admin-form__group">
                              <label className="admin-form__label" htmlFor={`event-status-${event.id}`}>{t("admin.common.fields.status")}</label>
                              <select id={`event-status-${event.id}`} name="status" className="admin-form__field" defaultValue={event.status}>
                                <option value="draft">{t("admin.events.status.draft")}</option>
                                <option value="published">{t("admin.events.status.published")}</option>
                                <option value="cancelled">{t("admin.events.status.cancelled")}</option>
                              </select>
                            </div>
                          </div>
                          <div className="admin-form__actions">
                            <button type="submit" className="admin-form__submit">{t("admin.events.saveSubmit")}</button>
                          </div>
                        </form>
                      </AdminEditModal>
                      <AdminEditModal triggerLabel={t("admin.events.participantsTrigger", { count: event.participantRows.length })} title={t("admin.events.participantsTitle", { title: event.title })}>
                        <div className="admin-event-participants">
                          <div className="admin-form__actions">
                            <Link href={`/admin/events/${event.id}/participants.csv`} className="admin-form__submit">
                              {t("admin.events.exportCsv")}
                            </Link>
                          </div>
                          {event.participantRows.length === 0 ? (
                            <p className="admin-dashboard__empty">{t("admin.events.noParticipants")}</p>
                          ) : (
                            <div className="admin-table">
                              <table className="admin-table__table">
                                <thead>
                                  <tr className="admin-table__row">
                                    <th className="admin-table__cell admin-table__cell--head">{t("admin.common.table.customer")}</th>
                                    <th className="admin-table__cell admin-table__cell--head">{t("admin.events.participants.contacts")}</th>
                                    <th className="admin-table__cell admin-table__cell--head">{t("admin.events.participants.payment")}</th>
                                    <th className="admin-table__cell admin-table__cell--head">{t("admin.common.table.status")}</th>
                                    <th className="admin-table__cell admin-table__cell--head">{t("admin.common.table.actions")}</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {event.participantRows.map((participant) => (
                                    <tr key={participant.registrationId} className="admin-table__row">
                                      <td className="admin-table__cell">
                                        <div className="admin-bookings__cell-title">{participant.customerName}</div>
                                        <div className="admin-bookings__cell-sub">
                                          {formatDateInVenueTimezone(participant.createdAt)}, {formatTimeInVenueTimezone(participant.createdAt)}
                                        </div>
                                      </td>
                                      <td className="admin-table__cell">
                                        <div>{participant.customerPhone}</div>
                                        <div className="admin-bookings__cell-sub">{participant.customerEmail}</div>
                                      </td>
                                      <td className="admin-table__cell">{participant.pricePaidKzt.toLocaleString("ru-KZ")} ₸</td>
                                      <td className="admin-table__cell">
                                        {participant.status === "confirmed" ? t("admin.events.participantStatus.confirmed") : t("admin.events.participantStatus.cancelled")}
                                        {participant.cancelledAt ? (
                                          <div className="admin-bookings__cell-sub">
                                            {formatDateInVenueTimezone(participant.cancelledAt)}, {formatTimeInVenueTimezone(participant.cancelledAt)}
                                          </div>
                                        ) : null}
                                      </td>
                                      <td className="admin-table__cell">
                                        {participant.status === "confirmed" ? (
                                          <form action={cancelParticipantAction}>
                                            <input type="hidden" name="registrationId" value={participant.registrationId} />
                                            <button type="submit" className="admin-bookings__action-button admin-bookings__action-button--danger">
                                              {t("admin.events.cancelParticipant")}
                                            </button>
                                          </form>
                                        ) : (
                                          <span className="admin-bookings__cell-sub">—</span>
                                        )}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      </AdminEditModal>
                      {event.status !== "published" ? (
                        <form action={statusAction}>
                          <input type="hidden" name="eventId" value={event.id} />
                          <input type="hidden" name="status" value="published" />
                          <button type="submit" className="admin-bookings__action-button">{t("admin.events.actions.publish")}</button>
                        </form>
                      ) : null}
                      {event.status !== "draft" ? (
                        <form action={statusAction}>
                          <input type="hidden" name="eventId" value={event.id} />
                          <input type="hidden" name="status" value="draft" />
                          <button type="submit" className="admin-bookings__action-button">{t("admin.events.actions.toDraft")}</button>
                        </form>
                      ) : null}
                      {event.status !== "cancelled" ? (
                        <form action={statusAction}>
                          <input type="hidden" name="eventId" value={event.id} />
                          <input type="hidden" name="status" value="cancelled" />
                          <button type="submit" className="admin-bookings__action-button admin-bookings__action-button--danger">
                            {t("admin.events.actions.cancelAndRefund")}
                          </button>
                        </form>
                      ) : null}
                    </div>
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
