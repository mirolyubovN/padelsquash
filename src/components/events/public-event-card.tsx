"use client";

import { useMemo, useState } from "react";

export interface PublicEventCardOccurrence {
  id: string;
  dateLabel: string;
  timeLabel: string;
  priceLabel: string;
  spotsLeft: number;
  capacity: number;
  isRegistered: boolean;
}

export interface PublicEventCardGroup {
  id: string;
  isRecurring: boolean;
  title: string;
  description: string | null;
  nearestLabel: string;
  priceLabel: string;
  sportName: string | null;
  courtNames: string[];
  level: string | null;
  instructorName: string | null;
  locationName: string | null;
  occurrences: PublicEventCardOccurrence[];
}

interface PublicEventCardProps {
  eventGroup: PublicEventCardGroup;
  registerAction: (formData: FormData) => void | Promise<void>;
  cancelAction: (formData: FormData) => void | Promise<void>;
}

export function PublicEventCard({ eventGroup, registerAction, cancelAction }: PublicEventCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState(eventGroup.occurrences[0]?.id ?? "");
  const selectedOccurrence = useMemo(
    () => eventGroup.occurrences.find((event) => event.id === selectedEventId) ?? eventGroup.occurrences[0],
    [eventGroup.occurrences, selectedEventId],
  );

  const tags = [
    eventGroup.sportName,
    eventGroup.courtNames.length > 0 ? `Корты: ${eventGroup.courtNames.join(", ")}` : null,
    eventGroup.level,
    eventGroup.instructorName ? `Тренер: ${eventGroup.instructorName}` : null,
    eventGroup.locationName,
  ].filter(Boolean);

  const isFull = !selectedOccurrence || selectedOccurrence.spotsLeft <= 0;

  return (
    <>
      <article className="card-grid__item event-card">
        <div className="card-grid__badge">
          {eventGroup.isRecurring ? "Регулярное событие" : "Событие"}
        </div>
        <h2 className="card-grid__title">{eventGroup.title}</h2>
        <p className="card-grid__meta">Ближайшая дата: {eventGroup.nearestLabel}</p>
        {eventGroup.description ? <p className="card-grid__text">{eventGroup.description}</p> : null}
        <ul className="tag-list">
          {tags.map((tag) => (
            <li key={tag} className="tag-list__item">
              {tag}
            </li>
          ))}
        </ul>
        <div className="event-card__summary">
          <span>{eventGroup.priceLabel}</span>
        </div>

        <div className="card-grid__actions">
          <button type="button" className="card-grid__button" onClick={() => setIsModalOpen(true)}>
            Выбрать дату
          </button>
        </div>
      </article>

      {isModalOpen ? (
        <div className="event-card-modal" role="dialog" aria-modal="true" aria-labelledby={`event-modal-title-${eventGroup.id}`}>
          <button
            type="button"
            className="event-card-modal__backdrop"
            aria-label="Закрыть выбор даты"
            onClick={() => setIsModalOpen(false)}
          />
          <div className="event-card-modal__panel">
            <div className="event-card-modal__head">
              <div>
                <span className="event-card-modal__eyebrow">Выбор даты</span>
                <h3 id={`event-modal-title-${eventGroup.id}`} className="event-card-modal__title">
                  {eventGroup.title}
                </h3>
              </div>
              <button type="button" className="event-card-modal__close" onClick={() => setIsModalOpen(false)}>
                Закрыть
              </button>
            </div>

            <div className="event-card__date-select">
              <label className="event-card__date-label" htmlFor={`event-date-${eventGroup.id}`}>
                Дата события
              </label>
              <select
                id={`event-date-${eventGroup.id}`}
                className="event-card__date-field"
                value={selectedOccurrence?.id ?? ""}
                onChange={(event) => setSelectedEventId(event.target.value)}
              >
                {eventGroup.occurrences.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.dateLabel}, {event.timeLabel}
                  </option>
                ))}
              </select>
            </div>

            {selectedOccurrence ? (
              <div className="event-card__selected">
                <div>
                  <span className="event-card__selected-label">Выбранная дата</span>
                  <strong className="event-card__selected-value">
                    {selectedOccurrence.dateLabel}, {selectedOccurrence.timeLabel}
                  </strong>
                </div>
                <div>
                  <span className="event-card__selected-label">Доступность</span>
                  <strong className="event-card__selected-value">
                    Свободно {selectedOccurrence.spotsLeft} из {selectedOccurrence.capacity}
                  </strong>
                </div>
                <div>
                  <span className="event-card__selected-label">Цена</span>
                  <strong className="event-card__selected-value">{selectedOccurrence.priceLabel}</strong>
                </div>
              </div>
            ) : null}

            <div className="card-grid__actions">
              {selectedOccurrence?.isRegistered ? (
                <form action={cancelAction} className="event-card__registered-form">
                  <input type="hidden" name="eventId" value={selectedOccurrence.id} />
                  <span className="event-card__registered">Вы записаны</span>
                  <button type="submit" className="listing-page__link-button">
                    Отменить запись
                  </button>
                </form>
              ) : isFull ? (
                <span className="event-card__registered event-card__registered--muted">Мест нет</span>
              ) : selectedOccurrence ? (
                <form action={registerAction}>
                  <input type="hidden" name="eventId" value={selectedOccurrence.id} />
                  <button type="submit" className="card-grid__button">
                    Записаться
                  </button>
                </form>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
