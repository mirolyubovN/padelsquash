"use client";

import { useModal } from "@/src/hooks/use-modal";
import { Dialog } from "@/src/components/ui/dialog";
import { FormSubmitButton } from "@/src/components/ui/form-submit-button";
import { t } from "@/src/lib/i18n";

interface TrainerCancelBookingFormProps {
  bookingId: string;
  sessionLabel: string;
  cancelAction: (formData: FormData) => Promise<void>;
}

export function TrainerCancelBookingForm({
  bookingId,
  sessionLabel,
  cancelAction,
}: TrainerCancelBookingFormProps) {
  const { open, show, hide } = useModal();

  return (
    <>
      <button
        type="button"
        className="admin-bookings__action-button admin-bookings__action-button--danger"
        onClick={show}
      >
        {t("trainer.cancel.open")}
      </button>

      <Dialog open={open} onClose={hide} title={t("trainer.cancel.title")}>
        <p className="account-dialog__text">
          {t("trainer.cancel.confirmation", { sessionLabel })}
        </p>
        <form action={cancelAction} className="account-dialog__form">
          <input type="hidden" name="bookingId" value={bookingId} />
          <div className="admin-form__group">
            <label className="admin-form__label" htmlFor={`cancel-reason-${bookingId}`}>
              {t("trainer.cancel.reasonLabel")} <span style={{ color: "#b91c1c" }}>*</span>
            </label>
            <textarea
              id={`cancel-reason-${bookingId}`}
              name="cancellationReason"
              className="admin-form__field"
              rows={3}
              required
              placeholder={t("trainer.cancel.reasonPlaceholder")}
            />
          </div>
          <div className="account-dialog__actions">
            <FormSubmitButton
              className="admin-bookings__action-button admin-bookings__action-button--danger"
              label={t("trainer.cancel.confirm")}
              loadingLabel={t("trainer.cancel.submitting")}
            />
            <button type="button" className="admin-bookings__action-button" onClick={hide}>
              {t("common.back")}
            </button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
