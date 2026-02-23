import Link from "next/link";
import { bookingPreviewContent, serviceItems } from "@/src/lib/content/site-data";

export function BookingFormPreview() {
  return (
    <section className="booking-preview" aria-labelledby="booking-preview-title">
      <div className="booking-preview__header">
        <p className="booking-preview__eyebrow">{bookingPreviewContent.eyebrow}</p>
        <h2 id="booking-preview-title" className="booking-preview__title">
          {bookingPreviewContent.title}
        </h2>
        <p className="booking-preview__text">
          {bookingPreviewContent.text}
        </p>
      </div>

      <div className="booking-preview__panel">
        <div className="booking-preview__group">
          <label htmlFor="booking-service" className="booking-preview__label">
            Услуга
          </label>
          <select id="booking-service" className="booking-preview__field" defaultValue="">
            <option value="" disabled>
              Выберите услугу
            </option>
            {serviceItems.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </div>

        <div className="booking-preview__row">
          <div className="booking-preview__group">
            <label htmlFor="booking-date" className="booking-preview__label">
              Дата
            </label>
            <input id="booking-date" type="date" className="booking-preview__field" />
          </div>
          <div className="booking-preview__group">
            <label htmlFor="booking-session" className="booking-preview__label">
              Сессия
            </label>
            <input
              id="booking-session"
              type="text"
              className="booking-preview__field"
              value="60 минут (фиксировано)"
              readOnly
            />
          </div>
        </div>

        <div className="booking-preview__slots">
          <p className="booking-preview__slots-title">{bookingPreviewContent.sampleSlotsTitle}</p>
          <ul className="booking-preview__slots-list">
            {bookingPreviewContent.sampleSlots.map((slot) => (
              <li
                key={slot.time}
                className={`booking-preview__slot booking-preview__slot--${slot.status}`}
              >
                {slot.time}
              </li>
            ))}
          </ul>
        </div>

        <div className="booking-preview__actions">
          <button type="button" className="booking-preview__button">
            Проверить доступность
          </button>
          <Link href="/book" className="booking-preview__link">
            {bookingPreviewContent.primaryActionLabel}
          </Link>
        </div>
      </div>
    </section>
  );
}
