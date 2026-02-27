"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";

interface AdminConfirmActionFormProps {
  action: (formData: FormData) => void | Promise<void>;
  hiddenFields: Record<string, string>;
  triggerLabel: string;
  confirmLabel?: string;
  title: string;
  description: string;
  triggerClassName?: string;
}

function ConfirmSubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className={`admin-bookings__action-button admin-bookings__action-button--danger${pending ? " admin-bookings__action-button--loading" : ""}`}
      disabled={pending}
    >
      {pending ? "Выполняем..." : label}
    </button>
  );
}

export function AdminConfirmActionForm({
  action,
  hiddenFields,
  triggerLabel,
  confirmLabel = "Подтвердить",
  title,
  description,
  triggerClassName = "admin-bookings__action-button",
}: AdminConfirmActionFormProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" className={triggerClassName} onClick={() => setOpen(true)}>
        {triggerLabel}
      </button>

      {open ? (
        <div className="account-dialog__backdrop" role="presentation" onClick={() => setOpen(false)}>
          <div
            className="account-dialog"
            role="dialog"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="account-dialog__title">{title}</h3>
            <p className="account-dialog__text">{description}</p>
            <form action={action} className="account-dialog__actions">
              {Object.entries(hiddenFields).map(([name, value]) => (
                <input key={name} type="hidden" name={name} value={value} />
              ))}
              <ConfirmSubmitButton label={confirmLabel} />
              <button
                type="button"
                className="admin-bookings__action-button"
                onClick={() => setOpen(false)}
              >
                Отмена
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
