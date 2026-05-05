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
  if (status === "published") return "Опубликовано";
  if (status === "draft") return "Черновик";
  if (status === "cancelled") return "Отменено";
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
    await assertAdmin();
    const eventId = String(formData.get("eventId") ?? "");
    const statusRaw = String(formData.get("status") ?? "");
    const status = statusRaw === "draft" || statusRaw === "published" || statusRaw === "cancelled" ? statusRaw : null;
    if (!eventId || !status) {
      throw new Error("Некорректный статус события");
    }
    await setEventStatus({ eventId, status });
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
    await assertAdmin();
    const registrationId = String(formData.get("registrationId") ?? "");
    if (!registrationId) {
      throw new Error("Некорректная запись на событие");
    }
    await cancelEventRegistrationByAdmin({ registrationId });
    revalidateEvents();
  }

  return (
    <AdminPageShell
      title="События"
      description="Создавайте клубные дни, групповые тренировки и повторяющиеся еженедельные события с лимитом мест и оплатой с баланса клиента."
    >
      <section className="admin-section">
        <div className="admin-section__head">
          <h2 className="admin-section__title">Новое событие</h2>
          <p className="admin-section__description">
            Для регулярных групп выберите «Повторять еженедельно» и количество недель: система создаст отдельные события.
          </p>
        </div>

        <form action={createAction} className="admin-form admin-form--panel">
          <input type="hidden" name="category" value="group_training" />
          <div className="admin-form__panel-grid">
            <div className="admin-form__group">
              <label className="admin-form__label" htmlFor="event-title">Название</label>
              <input id="event-title" name="title" className="admin-form__field" placeholder="Клубный день по паделу" required />
            </div>
            <div className="admin-form__group">
              <label className="admin-form__label" htmlFor="event-description">Описание</label>
              <textarea id="event-description" name="description" className="admin-form__field admin-form__textarea" placeholder="Для кого событие, что входит, формат занятия" />
            </div>
            <div className="admin-form__group">
              <label className="admin-form__label" htmlFor="event-level">Уровень</label>
              <input id="event-level" name="level" className="admin-form__field" placeholder="Новички / средний / все уровни" />
            </div>
            <EventCourtPicker sports={options.sports} courts={options.courts} idPrefix="event-create" />
            <div className="admin-form__group">
              <label className="admin-form__label" htmlFor="event-location">Локация</label>
              <select id="event-location" name="locationId" className="admin-form__field" defaultValue={options.locations[0]?.id ?? ""}>
                <option value="">Не привязывать</option>
                {options.locations.map((location) => (
                  <option key={location.id} value={location.id}>{location.name}</option>
                ))}
              </select>
            </div>
            <div className="admin-form__group">
              <label className="admin-form__label" htmlFor="event-instructor">Тренер</label>
              <select id="event-instructor" name="instructorId" className="admin-form__field" defaultValue="">
                <option value="">Без тренера</option>
                {options.instructors.map((instructor) => (
                  <option key={instructor.id} value={instructor.id}>{instructor.name}</option>
                ))}
              </select>
            </div>
            <div className="admin-form__group">
              <label className="admin-form__label" htmlFor="event-date">Дата первого события</label>
              <input id="event-date" name="date" type="date" className="admin-form__field" defaultValue={today} required />
            </div>
            <div className="admin-form__group">
              <label className="admin-form__label" htmlFor="event-start-time">Время начала</label>
              <input id="event-start-time" name="startTime" type="time" step="900" className="admin-form__field" defaultValue="19:00" required />
            </div>
            <div className="admin-form__group">
              <label className="admin-form__label" htmlFor="event-duration">Длительность, минут</label>
              <input id="event-duration" name="durationMin" type="number" min="30" max="480" step="15" className="admin-form__field" defaultValue={90} required />
            </div>
            <div className="admin-form__group">
              <label className="admin-form__label" htmlFor="event-price">Цена, KZT</label>
              <input id="event-price" name="priceKzt" type="number" min="0" step="1" className="admin-form__field" defaultValue={0} required />
            </div>
            <div className="admin-form__group">
              <label className="admin-form__label" htmlFor="event-capacity">Максимум участников</label>
              <input id="event-capacity" name="capacity" type="number" min="1" max="200" step="1" className="admin-form__field" defaultValue={8} required />
            </div>
            <div className="admin-form__group">
              <label className="admin-form__label" htmlFor="event-recurrence">Повтор</label>
              <select id="event-recurrence" name="recurrence" className="admin-form__field" defaultValue="none">
                <option value="none">Один раз</option>
                <option value="weekly">Повторять еженедельно</option>
              </select>
            </div>
            <div className="admin-form__group">
              <label className="admin-form__label" htmlFor="event-repeat-count">Количество недель</label>
              <input id="event-repeat-count" name="repeatCount" type="number" min="1" max="52" step="1" className="admin-form__field" defaultValue={4} />
            </div>
            <div className="admin-form__group">
              <label className="admin-form__checkbox">
                <input name="publish" type="checkbox" defaultChecked />
                <span>Опубликовать сразу</span>
              </label>
            </div>
          </div>
          <div className="admin-form__actions">
            <button type="submit" className="admin-form__submit">Создать событие</button>
          </div>
          <EventCreateConfirmation />
        </form>
      </section>

      <div className="admin-table">
        <table className="admin-table__table">
          <thead>
            <tr className="admin-table__row">
              <th className="admin-table__cell admin-table__cell--head">Событие</th>
              <th className="admin-table__cell admin-table__cell--head">Дата</th>
              <th className="admin-table__cell admin-table__cell--head">Цена / места</th>
              <th className="admin-table__cell admin-table__cell--head">Статус</th>
              <th className="admin-table__cell admin-table__cell--head">Действия</th>
            </tr>
          </thead>
          <tbody>
            {events.length === 0 ? (
              <tr className="admin-table__row">
                <td className="admin-table__cell" colSpan={5}>Событий пока нет.</td>
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
                        event.courtNames.length > 0 ? `Корты: ${event.courtNames.join(", ")}` : null,
                        event.instructorName,
                      ].filter(Boolean).join(" · ")}
                    </div>
                  </td>
                  <td className="admin-table__cell">{eventDateTimeLabel(event.startsAt, event.endsAt)}</td>
                  <td className="admin-table__cell">
                    <div>{event.priceKzt.toLocaleString("ru-KZ")} ₸</div>
                    <div className="admin-bookings__cell-sub">
                      {event.confirmedCount}/{event.capacity} участников, свободно {event.spotsLeft}
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
                      <AdminEditModal triggerLabel="Редактировать" title={`Событие: ${event.title}`}>
                        <form action={updateAction} className="admin-form">
                          <input type="hidden" name="eventId" value={event.id} />
                          <input type="hidden" name="category" value={event.category} />
                          <div className="admin-form__panel-grid">
                            <div className="admin-form__group">
                              <label className="admin-form__label" htmlFor={`event-title-${event.id}`}>Название</label>
                              <input id={`event-title-${event.id}`} name="title" className="admin-form__field" defaultValue={event.title} required />
                            </div>
                            <div className="admin-form__group">
                              <label className="admin-form__label" htmlFor={`event-description-${event.id}`}>Описание</label>
                              <textarea id={`event-description-${event.id}`} name="description" className="admin-form__field admin-form__textarea" defaultValue={event.description ?? ""} />
                            </div>
                            <div className="admin-form__group">
                              <label className="admin-form__label" htmlFor={`event-level-${event.id}`}>Уровень</label>
                              <input id={`event-level-${event.id}`} name="level" className="admin-form__field" defaultValue={event.level ?? ""} />
                            </div>
                            <EventCourtPicker
                              sports={options.sports}
                              courts={options.courts}
                              defaultSportId={event.sportId}
                              defaultCourtIds={event.courtIds}
                              idPrefix={`event-edit-${event.id}`}
                            />
                            <div className="admin-form__group">
                              <label className="admin-form__label" htmlFor={`event-location-${event.id}`}>Локация</label>
                              <select id={`event-location-${event.id}`} name="locationId" className="admin-form__field" defaultValue={event.locationId ?? ""}>
                                <option value="">Не привязывать</option>
                                {options.locations.map((location) => (
                                  <option key={location.id} value={location.id}>{location.name}</option>
                                ))}
                              </select>
                            </div>
                            <div className="admin-form__group">
                              <label className="admin-form__label" htmlFor={`event-instructor-${event.id}`}>Тренер</label>
                              <select id={`event-instructor-${event.id}`} name="instructorId" className="admin-form__field" defaultValue={event.instructorId ?? ""}>
                                <option value="">Без тренера</option>
                                {options.instructors.map((instructor) => (
                                  <option key={instructor.id} value={instructor.id}>{instructor.name}</option>
                                ))}
                              </select>
                            </div>
                            <div className="admin-form__group">
                              <label className="admin-form__label" htmlFor={`event-date-${event.id}`}>Дата</label>
                              <input id={`event-date-${event.id}`} name="date" type="date" className="admin-form__field" defaultValue={toVenueIsoDate(event.startsAt)} required />
                            </div>
                            <div className="admin-form__group">
                              <label className="admin-form__label" htmlFor={`event-time-${event.id}`}>Время начала</label>
                              <input id={`event-time-${event.id}`} name="startTime" type="time" step="900" className="admin-form__field" defaultValue={formatTimeInVenueTimezone(event.startsAt)} required />
                            </div>
                            <div className="admin-form__group">
                              <label className="admin-form__label" htmlFor={`event-duration-${event.id}`}>Длительность, минут</label>
                              <input id={`event-duration-${event.id}`} name="durationMin" type="number" min="30" max="480" step="15" className="admin-form__field" defaultValue={eventDurationMin(event.startsAt, event.endsAt)} required />
                            </div>
                            <div className="admin-form__group">
                              <label className="admin-form__label" htmlFor={`event-price-${event.id}`}>Цена, KZT</label>
                              <input id={`event-price-${event.id}`} name="priceKzt" type="number" min="0" step="1" className="admin-form__field" defaultValue={event.priceKzt} required />
                            </div>
                            <div className="admin-form__group">
                              <label className="admin-form__label" htmlFor={`event-capacity-${event.id}`}>Максимум участников</label>
                              <input id={`event-capacity-${event.id}`} name="capacity" type="number" min={event.confirmedCount} max="200" step="1" className="admin-form__field" defaultValue={event.capacity} required />
                            </div>
                            <div className="admin-form__group">
                              <label className="admin-form__label" htmlFor={`event-status-${event.id}`}>Статус</label>
                              <select id={`event-status-${event.id}`} name="status" className="admin-form__field" defaultValue={event.status}>
                                <option value="draft">Черновик</option>
                                <option value="published">Опубликовано</option>
                                <option value="cancelled">Отменено</option>
                              </select>
                            </div>
                          </div>
                          <div className="admin-form__actions">
                            <button type="submit" className="admin-form__submit">Сохранить событие</button>
                          </div>
                        </form>
                      </AdminEditModal>
                      <AdminEditModal triggerLabel={`Участники (${event.participantRows.length})`} title={`Участники: ${event.title}`}>
                        <div className="admin-event-participants">
                          <div className="admin-form__actions">
                            <Link href={`/admin/events/${event.id}/participants.csv`} className="admin-form__submit">
                              Экспорт CSV
                            </Link>
                          </div>
                          {event.participantRows.length === 0 ? (
                            <p className="admin-dashboard__empty">Записей пока нет.</p>
                          ) : (
                            <div className="admin-table">
                              <table className="admin-table__table">
                                <thead>
                                  <tr className="admin-table__row">
                                    <th className="admin-table__cell admin-table__cell--head">Клиент</th>
                                    <th className="admin-table__cell admin-table__cell--head">Контакты</th>
                                    <th className="admin-table__cell admin-table__cell--head">Оплата</th>
                                    <th className="admin-table__cell admin-table__cell--head">Статус</th>
                                    <th className="admin-table__cell admin-table__cell--head">Действия</th>
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
                                        {participant.status === "confirmed" ? "Записан" : "Отменен"}
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
                                              Отменить и вернуть
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
                          <button type="submit" className="admin-bookings__action-button">Опубликовать</button>
                        </form>
                      ) : null}
                      {event.status !== "draft" ? (
                        <form action={statusAction}>
                          <input type="hidden" name="eventId" value={event.id} />
                          <input type="hidden" name="status" value="draft" />
                          <button type="submit" className="admin-bookings__action-button">В черновик</button>
                        </form>
                      ) : null}
                      {event.status !== "cancelled" ? (
                        <form action={statusAction}>
                          <input type="hidden" name="eventId" value={event.id} />
                          <input type="hidden" name="status" value="cancelled" />
                          <button type="submit" className="admin-bookings__action-button admin-bookings__action-button--danger">
                            Отменить событие и вернуть всем
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
