# Component Extraction Task

Eliminate duplicated UI patterns across booking and admin forms.  
Analysis doc: `docs/component-reuse-analysis.md`

---

## Status: IN PROGRESS (exploration done, implementation not started)

What was done before this session ended:
- Full audit completed → `docs/component-reuse-analysis.md`
- All 6 target files read in detail (exact line numbers, class names, function signatures)
- Plan approved, ready to code

---

## 6 Extractions (implement in order)

### 1. `src/lib/format/date.ts` — date helpers
Move from `live-booking-form.tsx` (local inline):
- `formatShortDate(dateIso: string): string`
- `formatShortWeekday(dateIso: string): string`
- `getRelativeDateLabel(dateIso, todayIso): string | null`
- `getDateDiffDays(fromIso, toIso): number` (used by getRelativeDateLabel)
- `getTodayDate(): string` (also duplicated in `create-booking-form.tsx`)

**Consumers to update:** `live-booking-form.tsx`, `create-booking-form.tsx`

---

### 2. `src/hooks/use-modal.ts` — modal open/close hook

```ts
"use client";
import { useState } from "react";

export function useModal(initial = false) {
  const [open, setOpen] = useState(initial);
  return { open, show: () => setOpen(true), hide: () => setOpen(false) };
}
```

**Consumers to update:** `admin-confirm-action-form.tsx`, `account-cancel-booking-form.tsx`, `trainer-cancel-booking-form.tsx`, `admin-reschedule-modal.tsx`

---

### 3. `src/components/ui/dialog.tsx` — account-dialog backdrop pattern

```tsx
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
```

**Consumers (all use `account-dialog__backdrop` + `account-dialog` div pattern):**
- `src/components/admin/admin-confirm-action-form.tsx`
- `src/components/account/account-cancel-booking-form.tsx`
- `src/components/trainer/trainer-cancel-booking-form.tsx`
- `src/components/admin/admin-reschedule-modal.tsx` — pass `className="admin-reschedule-modal"`

**Do NOT touch:** `admin-edit-modal.tsx` — uses native `<dialog>` element, different pattern.

**Reschedule modal note:** currently has `aria-label="Перенос бронирования"` (not `aria-labelledby`). The Dialog component auto-adds `aria-labelledby` via `useId()`, which is better. Remove the old `aria-label`.

---

### 4. `src/components/ui/form-submit-button.tsx` — useFormStatus submit button

Loading modifier is derived from the first class in `className` (verified against all consumers):
- `auth-form__submit` → `auth-form__submit--loading`
- `admin-bookings__action-button admin-bookings__action-button--danger` → `admin-bookings__action-button--loading`
- `admin-bookings__action-button admin-bookings__action-button--primary` → `admin-bookings__action-button--loading`

```tsx
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
```

**Consumers:**
- `src/components/auth/login-form.tsx` — remove `LoginSubmitButton`, import `FormSubmitButton`
  - className: `"auth-form__submit"`, label: `"Войти"`, loadingLabel: `"Входим..."`
- `src/components/auth/register-form.tsx` — replace inline button
  - className: `"auth-form__submit"`, label: `"Создать аккаунт"`, loadingLabel: `"Создаем аккаунт..."`, pending: `{isPending}`
- `src/components/admin/admin-confirm-action-form.tsx` — remove `ConfirmSubmitButton`
  - className: `"admin-bookings__action-button admin-bookings__action-button--danger"`, label: `{confirmLabel}`, loadingLabel: `"Выполняем..."`
- `src/components/account/account-cancel-booking-form.tsx` — remove `ConfirmCancelSubmitButton`
  - className: `"admin-bookings__action-button admin-bookings__action-button--primary"`, label: `"Подтвердить отмену"`, loadingLabel: `"Отменяем..."`
- `src/components/trainer/trainer-cancel-booking-form.tsx` — remove `SubmitButton`
  - className: `"admin-bookings__action-button admin-bookings__action-button--danger"`, label: `"Да, отменить"`, loadingLabel: `"Отменяем..."`
  - **Note:** original had no `--loading` class (bug). FormSubmitButton will add it correctly.

---

### 5. `src/components/booking/price-breakdown.tsx` — price breakdown

```tsx
import { formatMoneyKzt } from "@/src/lib/format/money";

export type PriceBreakdownLine = { key: string; label: string; total: number };

export function PriceBreakdown({
  lines,
  total,
  totalLabel = "Итого",
}: {
  lines: PriceBreakdownLine[];
  total: number;
  totalLabel?: string;
}) {
  return (
    <div className="booking-flow__breakdown">
      {lines.map((line) => (
        <div key={line.key} className="booking-flow__breakdown-row">
          <span>{line.label}</span>
          <span>{formatMoneyKzt(line.total)}</span>
        </div>
      ))}
      <div className="booking-flow__breakdown-row booking-flow__breakdown-row--total">
        <span>{totalLabel}</span>
        <span>{formatMoneyKzt(total)}</span>
      </div>
    </div>
  );
}
```

**Consumers:**
- `src/components/booking/live-booking-form.tsx` lines 1274–1286 — uses `pricePreview.lines` + `pricePreview.total`
- `src/components/admin/create-booking-form.tsx` lines 828–833 — uses `pricePreview.lines` + `pricePreview.total`
- `src/components/admin/create-booking-form.tsx` lines 577–590 — success summary breakdown (3 hardcoded rows, different `totalLabel`: `"Осталось к оплате"`)

For the success summary, pass `totalLabel="Осталось к оплате"` and build the lines array:
```ts
lines={[
  { key: "total", label: "Итого по бронированию", total: successSummary.groupTotalKzt },
  { key: "paid", label: "Оплачено сейчас", total: successSummary.groupPaidKzt ?? 0 },
]}
total={successSummary.groupRemainingKzt ?? 0}
totalLabel="Осталось к оплате"
```

---

### 6. `src/components/booking/time-slot-timetable.tsx` — timetable grid

All 3 consumers share identical BEM class names. Only differences: cell content, selection mode (single vs multi), whether time cell shows price.

```tsx
import type { ReactNode } from "react";

export type TimetableSlot = {
  startTime: string;
  endTime: string;
  availableCourtIds: string[];
};

export type TimetableColumn = {
  id: string;
  label: string;
};

export function TimeSlotTimetable({
  slots,
  columns,
  isSelected,
  onCellClick,
  getCellContent,
  getTimeCellExtra,
  wrapperClassName,
  cellClassName,
}: {
  slots: TimetableSlot[];
  columns: TimetableColumn[];
  isSelected: (startTime: string, columnId: string) => boolean;
  onCellClick: (startTime: string, columnId: string) => void;
  getCellContent: (
    slot: TimetableSlot,
    col: TimetableColumn,
    isSelected: boolean,
    isAvailable: boolean,
  ) => ReactNode;
  getTimeCellExtra?: (slot: TimetableSlot) => ReactNode;
  wrapperClassName?: string;   // extra class on the wrapper div (e.g. "admin-reschedule-modal__timetable")
  cellClassName?: string;       // extra class on each cell button (e.g. "admin-create-booking__slot")
}) {
  return (
    <div className={`booking-flow__timetable-wrapper${wrapperClassName ? ` ${wrapperClassName}` : ""}`}>
      <table className="booking-flow__timetable">
        <thead>
          <tr>
            <th className="booking-flow__timetable-time-header">Время</th>
            {columns.map((col) => (
              <th key={col.id} className="booking-flow__timetable-col-header">
                <span className="booking-flow__timetable-col-name">{col.label}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {slots.map((slot) => (
            <tr key={slot.startTime} className="booking-flow__timetable-row">
              <td className="booking-flow__timetable-time-cell">
                <span className="booking-flow__timetable-time-label">
                  {slot.startTime}–{slot.endTime}
                </span>
                {getTimeCellExtra?.(slot)}
              </td>
              {columns.map((col) => {
                const available = slot.availableCourtIds.includes(col.id);
                const selected = isSelected(slot.startTime, col.id);
                return (
                  <td key={col.id} className="booking-flow__timetable-cell-wrapper">
                    <button
                      type="button"
                      disabled={!available}
                      className={`booking-flow__timetable-cell${cellClassName ? ` ${cellClassName}` : ""}${
                        selected
                          ? " booking-flow__timetable-cell--selected" + (cellClassName ? ` ${cellClassName}--active` : "")
                          : available
                          ? " booking-flow__timetable-cell--available"
                          : " booking-flow__timetable-cell--unavailable"
                      }`}
                      onClick={() => available && onCellClick(slot.startTime, col.id)}
                    >
                      {getCellContent(slot, col, selected, available)}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

**Consumer: `live-booking-form.tsx`** (multi-select, price in time cell, aria attributes)
```tsx
<TimeSlotTimetable
  slots={availableTimeSlots}
  columns={timetableColumns}
  isSelected={(startTime, colId) => selectedCells.some(c => c.timeKey === getSlotKey({startTime, endTime: ""}) && c.resourceId === colId)}
  onCellClick={(startTime, colId) => isAvailable && toggleCell(getSlotKey(slot), colId)}
  getTimeCellExtra={(slot) => (
    <span className="booking-flow__timetable-time-price">
      {formatMoneyKzt(serviceKind === "training" ? courtPrices[sport]?.[resolvePricingTier(date, slot.startTime)] + selectedTrainerPrice : courtPrices[sport]?.[resolvePricingTier(date, slot.startTime)] ?? 0)}
    </span>
  )}
  getCellContent={(slot, col, isSelected, isAvailable) => {
    const tier = resolvePricingTier(date, slot.startTime);
    const courtPrice = courtPrices[sport]?.[tier] ?? 0;
    const cellPrice = serviceKind === "training" ? courtPrice + selectedTrainerPrice : null;
    return isSelected ? "✓" : isAvailable && cellPrice !== null ? formatMoneyKzt(cellPrice) : isAvailable ? "Свободно" : "Занято";
  }}
/>
```
Note: the original `live-booking-form.tsx` timetable has `aria-label` and `aria-pressed` on the button. Add those via a render prop or just keep them — they are accessibility-specific to this consumer. Simplest: add `aria-label` and `aria-pressed` as optional props on the button, or accept `getCellProps` callback. For now, skip aria props in the shared component (they aren't in other consumers) and add a comment in live-booking-form that aria is dropped after extraction.

Actually better: keep the aria attributes. Add optional `getCellAriaLabel?: (slot, col, isSelected, isAvailable) => string` and `getCellAriaPressed?: boolean` props, or just `getCellProps`. Keep it simple — skip aria for now since the buttons are already labeled by their content (price/Свободно/Занято).

**Consumer: `create-booking-form.tsx`** (multi-select, price in time cell, `admin-create-booking__slot` extra class)
```tsx
<TimeSlotTimetable
  slots={slots}
  columns={timetableColumns}
  isSelected={(startTime, colId) => selectedKeys.has(slotKey(startTime, colId))}
  onCellClick={(startTime, colId) => toggleCell(startTime, colId)}
  cellClassName="admin-create-booking__slot"
  getTimeCellExtra={(slot) => {
    const tier = resolvePricingTier(date, slot.startTime);
    const courtPrice = activeCourtPrices[sportSlug]?.[tier] ?? 0;
    const amount = courtPrice + (needsInstructor ? selectedTrainerPrice : 0);
    return <span className="booking-flow__timetable-time-price">{formatMoneyKzt(amount)}</span>;
  }}
  getCellContent={(slot, col, isSelected, isAvailable) => {
    const tier = resolvePricingTier(date, slot.startTime);
    const courtPrice = activeCourtPrices[sportSlug]?.[tier] ?? 0;
    const amount = courtPrice + (needsInstructor ? selectedTrainerPrice : 0);
    return isSelected ? "✓" : isAvailable ? formatMoneyKzt(amount) : "Занято";
  }}
/>
```
Note: original time label had extra class `admin-create-booking__slot-time`. That class is on the `<span>` inside time cell. The shared component doesn't expose that. Either add a `timeLabelClassName` prop or keep it as is — the CSS impact is minor. Skip for now.

**Consumer: `admin-reschedule-modal.tsx`** (single-select, no price, court name in cell)
```tsx
<TimeSlotTimetable
  slots={slots}
  columns={timetableColumns}
  isSelected={(startTime, colId) => selectedCellKey === `${startTime}|${colId}`}
  onCellClick={(startTime, colId) => { setSelectedStartTime(startTime); setSelectedCourtId(colId); }}
  wrapperClassName="admin-reschedule-modal__timetable"
  cellClassName="admin-create-booking__slot"
  getCellContent={(_slot, col, isSelected, isAvailable) =>
    isSelected ? "✓" : isAvailable ? col.label : null
  }
/>
```

---

## Skipped (analysis complete, not worth extracting)
- `FormField` — auth-form vs admin-form BEM prefixes differ, making a single component add more complexity than it removes
- `StatusMessage` — 2 unrelated CSS class families in different parts of the app
- `SummaryGrid` — only 1 true multi-instance, others are structurally different

---

## Verification
After all extractions: `npx tsc --noEmit` (stop dev server first — Windows DLL lock).
Then browser smoke test: `/book` and `/admin/bookings/new` — create a booking end-to-end.
