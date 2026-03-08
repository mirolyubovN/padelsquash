"use client";

import { useRef } from "react";

interface AdminEditModalProps {
  triggerLabel: string;
  title: string;
  children: React.ReactNode;
  triggerClassName?: string;
}

export function AdminEditModal({
  triggerLabel,
  title,
  children,
  triggerClassName,
}: AdminEditModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  function open() {
    dialogRef.current?.showModal();
  }

  function close() {
    dialogRef.current?.close();
  }

  function handleBackdropClick(e: React.MouseEvent<HTMLDialogElement>) {
    if (e.target === dialogRef.current) {
      close();
    }
  }

  return (
    <>
      <button
        type="button"
        className={triggerClassName ?? "admin-bookings__action-button"}
        onClick={open}
      >
        {triggerLabel}
      </button>

      <dialog
        ref={dialogRef}
        className="admin-modal"
        onClick={handleBackdropClick}
      >
        <div className="admin-modal__inner">
          <div className="admin-modal__header">
            <h2 className="admin-modal__title">{title}</h2>
            <button
              type="button"
              className="admin-modal__close"
              onClick={close}
              aria-label="Закрыть"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M1 1l12 12M13 1L1 13" />
              </svg>
            </button>
          </div>

          {/* onSubmit bubbles up from any form inside — close dialog on submit */}
          <div
            className="admin-modal__body"
            onSubmit={close}
          >
            {children}
          </div>
        </div>
      </dialog>
    </>
  );
}
