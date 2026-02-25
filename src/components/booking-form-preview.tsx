import Link from "next/link";
import { bookingPreviewContent } from "@/src/lib/content/site-data";

const previewSteps = [
  {
    number: "1",
    title: "Выберите спорт и формат",
    text: "Падел или сквош, аренда корта или тренировка с тренером.",
  },
  {
    number: "2",
    title: "Выберите дату и свободный час",
    text: "Система покажет свободные слоты по каждому корту на выбранную дату.",
  },
  {
    number: "3",
    title: "Войдите и подтвердите",
    text: "Подтвердите бронирование и управляйте записями в личном кабинете.",
  },
] as const;

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
        <ol className="booking-preview__steps" aria-label="Шаги бронирования">
          {previewSteps.map((step) => (
            <li key={step.number} className="booking-preview__step">
              <span className="booking-preview__step-badge" aria-hidden="true">
                {step.number}
              </span>
              <div className="booking-preview__step-body">
                <p className="booking-preview__step-title">{step.title}</p>
                <p className="booking-preview__step-text">{step.text}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="booking-preview__example" aria-hidden="true">
          <p className="booking-preview__example-title">{bookingPreviewContent.sampleSlotsTitle}</p>
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
          <Link href="/book" className="booking-preview__link">
            {bookingPreviewContent.primaryActionLabel}
          </Link>
        </div>
      </div>
    </section>
  );
}
