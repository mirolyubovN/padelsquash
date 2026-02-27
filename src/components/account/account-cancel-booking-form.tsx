"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";

interface AccountCancelBookingFormProps {
  bookingId: string;
  cancellationDeadlineText?: string;
  action: (formData: FormData) => void | Promise<void>;
}

function ConfirmCancelSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      className={`admin-bookings__action-button admin-bookings__action-button--primary${pending ? " admin-bookings__action-button--loading" : ""}`}
      disabled={pending}
    >
      {pending ? "Отменяем..." : "Подтвердить отмену"}
    </button>
  );
}

export function AccountCancelBookingForm({
  bookingId,
  cancellationDeadlineText,
  action,
}: AccountCancelBookingFormProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="admin-bookings__action-button admin-bookings__action-button--primary"
        onClick={() => setOpen(true)}
      >
        Отменить
      </button>

      {open ? (
        <div className="account-dialog__backdrop" role="presentation" onClick={() => setOpen(false)}>
          <div
            className="account-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby={`cancel-booking-title-${bookingId}`}
            onClick={(event) => event.stopPropagation()}
          >
            <h3 id={`cancel-booking-title-${bookingId}`} className="account-dialog__title">
              Подтвердите отмену
            </h3>
            <p className="account-dialog__text">
              Вы уверены, что хотите отменить это бронирование?
            </p>
            {cancellationDeadlineText ? (
              <p className="account-dialog__text">Бесплатная отмена доступна до: {cancellationDeadlineText}</p>
            ) : null}

            <form action={action} className="account-dialog__actions">
              <input type="hidden" name="bookingId" value={bookingId} />
              <ConfirmCancelSubmitButton />
              <button
                type="button"
                className="admin-bookings__action-button"
                onClick={() => setOpen(false)}
              >
                Назад
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
