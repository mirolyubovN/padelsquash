"use client";

import { useModal } from "@/src/hooks/use-modal";
import { Dialog } from "@/src/components/ui/dialog";
import { FormSubmitButton } from "@/src/components/ui/form-submit-button";
import { t } from "@/src/lib/i18n";

interface AccountCancelBookingFormProps {
  bookingId: string;
  itemType?: "booking" | "event";
  eventId?: string;
  cancellationDeadlineText?: string;
  action: (formData: FormData) => void | Promise<void>;
}

export function AccountCancelBookingForm({
  bookingId,
  itemType = "booking",
  eventId,
  cancellationDeadlineText,
  action,
}: AccountCancelBookingFormProps) {
  const { open, show, hide } = useModal();

  return (
    <>
      <button
        type="button"
        className="admin-bookings__action-button admin-bookings__action-button--primary"
        onClick={show}
      >
        {t("account.cancel.open")}
      </button>

      <Dialog open={open} onClose={hide} title={t("account.cancel.title")}>
        <p className="account-dialog__text">
          {t("account.cancel.confirmation", {
            item: itemType === "event" ? t("account.cancel.item.event") : t("account.cancel.item.booking"),
          })}
        </p>
        {cancellationDeadlineText ? (
          <p className="account-dialog__text">
            {t("account.cancel.deadline", { deadline: cancellationDeadlineText })}
          </p>
        ) : null}

        <form action={action} className="account-dialog__actions">
          <input type="hidden" name="bookingId" value={bookingId} />
          <input type="hidden" name="itemType" value={itemType} />
          {eventId ? <input type="hidden" name="eventId" value={eventId} /> : null}
          <FormSubmitButton
            className="admin-bookings__action-button admin-bookings__action-button--primary"
            label={t("account.cancel.confirm")}
            loadingLabel={t("account.cancel.submitting")}
          />
          <button type="button" className="admin-bookings__action-button" onClick={hide}>
            {t("common.back")}
          </button>
        </form>
      </Dialog>
    </>
  );
}
