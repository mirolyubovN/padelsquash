"use client";
import { useId, type ReactNode } from "react";

export function Dialog({
  open,
  onClose,
  title,
  className,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  className?: string;
  children: ReactNode;
}) {
  const id = useId();
  if (!open) return null;
  return (
    <div className="account-dialog__backdrop" role="presentation" onClick={onClose}>
      <div
        className={`account-dialog${className ? ` ${className}` : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={id}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id={id} className="account-dialog__title">{title}</h3>
        {children}
      </div>
    </div>
  );
}
