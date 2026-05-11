"use client";
import { useFormStatus } from "react-dom";

export function FormSubmitButton({
  label,
  loadingLabel,
  className,
  pending: pendingProp,
}: {
  label: string;
  loadingLabel: string;
  className: string;
  pending?: boolean;
}) {
  const { pending: formPending } = useFormStatus();
  const isPending = pendingProp ?? formPending;
  const baseClass = className.split(" ")[0];
  return (
    <button
      type="submit"
      className={`${className}${isPending ? ` ${baseClass}--loading` : ""}`}
      disabled={isPending}
    >
      {isPending ? loadingLabel : label}
    </button>
  );
}
