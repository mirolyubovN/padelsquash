"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";

interface TrainerCancelBookingFormProps {
  bookingId: string;
  sessionLabel: string; // e.g. "12.03.2026, 10:00"
  cancelAction: (formData: FormData) => Promise<void>;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className="admin-bookings__action-button admin-bookings__action-button--danger"
      disabled={pending}
    >
      {pending ? "Отменяем..." : "Да, отменить"}
    </button>
  );
}

export function TrainerCancelBookingForm({
  bookingId,
  sessionLabel,
  cancelAction,
}: TrainerCancelBookingFormProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" className="admin-bookings__action-button admin-bookings__action-button--danger" onClick={() => setOpen(true)}>
        Отменить
      </button>

      {open ? (
        <div className="account-dialog__backdrop" role="presentation" onClick={() => setOpen(false)}>
          <div
            className="account-dialog"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="account-dialog__title">Отмена тренировки</h3>
            <p className="account-dialog__text">
              Отменить тренировку <strong>{sessionLabel}</strong>? Клиент будет уведомлён, оплата вернётся на баланс.
            </p>
            <form action={cancelAction} className="account-dialog__form">
              <input type="hidden" name="bookingId" value={bookingId} />
              <div className="admin-form__group">
                <label className="admin-form__label" htmlFor={`cancel-reason-${bookingId}`}>
                  Причина отмены <span style={{ color: "#b91c1c" }}>*</span>
                </label>
                <textarea
                  id={`cancel-reason-${bookingId}`}
                  name="cancellationReason"
                  className="admin-form__field"
                  rows={3}
                  required
                  placeholder="Укажите причину отмены..."
                />
              </div>
              <div className="account-dialog__actions">
                <SubmitButton />
                <button
                  type="button"
                  className="admin-bookings__action-button"
                  onClick={() => setOpen(false)}
                >
                  Назад
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
