"use client";

import { useModal } from "@/src/hooks/use-modal";
import { Dialog } from "@/src/components/ui/dialog";
import { FormSubmitButton } from "@/src/components/ui/form-submit-button";
import { t } from "@/src/lib/i18n";

interface AdminConfirmActionFormProps {
  action: (formData: FormData) => void | Promise<void>;
  hiddenFields: Record<string, string>;
  triggerLabel: string;
  confirmLabel?: string;
  title: string;
  description: string;
  triggerClassName?: string;
}

export function AdminConfirmActionForm({
  action,
  hiddenFields,
  triggerLabel,
  confirmLabel = t("admin.confirmAction.defaultConfirm"),
  title,
  description,
  triggerClassName = "admin-bookings__action-button",
}: AdminConfirmActionFormProps) {
  const { open, show, hide } = useModal();

  return (
    <>
      <button type="button" className={triggerClassName} onClick={show}>
        {triggerLabel}
      </button>

      <Dialog open={open} onClose={hide} title={title}>
        <p className="account-dialog__text">{description}</p>
        <form action={action} className="account-dialog__actions">
          {Object.entries(hiddenFields).map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))}
          <FormSubmitButton
            className="admin-bookings__action-button admin-bookings__action-button--danger"
            label={confirmLabel}
            loadingLabel={t("admin.confirmAction.loading")}
          />
          <button type="button" className="admin-bookings__action-button" onClick={hide}>
            {t("admin.common.cancel")}
          </button>
        </form>
      </Dialog>
    </>
  );
}
