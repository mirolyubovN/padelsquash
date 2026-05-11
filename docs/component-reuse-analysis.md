# Component Reuse Analysis

Codebase audit of duplicated UI patterns that should be extracted into shared components. Ordered by impact.

---

## Priority 1 — High Impact

### 1. `FormField` — label + input + error group

**Pattern:**
```tsx
<div className="admin-form__group">
  <label className="admin-form__label" htmlFor="x">Label</label>
  <input id="x" name="x" type="text" className="admin-form__field" />
  {error ? <p id="x-error" className="admin-form__field-error" role="alert">{error}</p> : null}
</div>
```

**Affected files (20+ instances across 7 files):**
- `src/components/auth/register-form.tsx` — lines 31–161 (5 fields)
- `src/components/auth/login-form.tsx` — lines 41–77
- `src/components/auth/forgot-password-form.tsx` — lines 30–43
- `src/components/admin/create-booking-form.tsx` — lines 757–805
- `src/components/admin/media-upload-form.tsx` — lines 54–113
- `src/components/admin/admin-reschedule-modal.tsx` — lines 206–215
- `src/components/trainer/trainer-cancel-booking-form.tsx` — lines 52–64

**Proposed API:**
```tsx
<FormField
  id="email"
  name="email"
  label="Email"
  type="email"       // "text" | "email" | "password" | "number" | "textarea" | "select"
  error={errors.email}
  required
/>
```

---

### 2. `Dialog` — backdrop + modal shell

**Pattern (3 near-identical implementations):**
```tsx
<div className="account-dialog__backdrop" role="presentation" onClick={close}>
  <div className="account-dialog" role="dialog" aria-modal="true" onClick={stopPropagation}>
    <h3 className="account-dialog__title">{title}</h3>
    <p className="account-dialog__text">{text}</p>
    <div className="account-dialog__actions">{actions}</div>
  </div>
</div>
```

**Affected files:**
- `src/components/admin/admin-confirm-action-form.tsx` — lines 46–71
- `src/components/account/account-cancel-booking-form.tsx` — lines 47–79
- `src/components/trainer/trainer-cancel-booking-form.tsx` — lines 38–78
- `src/components/admin/admin-edit-modal.tsx` — lines 44–72
- `src/components/admin/admin-reschedule-modal.tsx` — lines 153–312
- `src/components/events/public-event-card.tsx` — lines 105–170
- `src/components/coaches/coach-gallery-list.tsx` — lines 119–174

**Proposed API:**
```tsx
<Dialog open={open} onClose={() => setOpen(false)} title="Заголовок">
  <p>Content or children</p>
  <Dialog.Actions>
    <button onClick={close}>Отмена</button>
    <button type="submit">Подтвердить</button>
  </Dialog.Actions>
</Dialog>
```

---

### 3. `TimeSlotTimetable` — slot/court selection table

**Pattern (3 nearly-identical large implementations):**
```tsx
<div className="booking-flow__timetable-wrapper">
  <table className="booking-flow__timetable">
    <thead>
      <tr>
        <th className="booking-flow__timetable-time-header">Время</th>
        {columns.map(col => <th key={col.id} className="booking-flow__timetable-col-header">{col.label}</th>)}
      </tr>
    </thead>
    <tbody>
      {slots.map(slot => (
        <tr key={slot.startTime}>
          <td className="booking-flow__timetable-time-cell">{slot.startTime}</td>
          {columns.map(col => (
            <td key={col.id} className="booking-flow__timetable-cell-wrapper">
              <button className={`booking-flow__timetable-cell${selected ? " --selected" : ""}`}>...</button>
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  </table>
</div>
```

**Affected files:**
- `src/components/booking/live-booking-form.tsx` — lines 1173–1239
- `src/components/admin/create-booking-form.tsx` — lines 682–717
- `src/components/admin/admin-reschedule-modal.tsx` — lines 224–274

**Proposed API:**
```tsx
<TimeSlotTimetable
  slots={slots}              // { startTime: string; endTime: string }[]
  columns={columns}          // { id: string; label: string }[]
  selectedCells={selected}   // Set<`${slotTime}:${colId}`>
  onCellToggle={(slot, col) => ...}
  renderCellContent={(slot, col) => <span>{price}</span>}  // optional
  isCellAvailable={(slot, col) => boolean}
/>
```

---

### 4. `FormSubmitButton` — submit with pending state

**Pattern (7+ instances):**
```tsx
function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={`cls${pending ? " --loading" : ""}`} disabled={pending}>
      {pending ? "Загрузка..." : "Подтвердить"}
    </button>
  );
}
```

**Affected files:**
- `src/components/auth/login-form.tsx` — lines 13–25
- `src/components/auth/register-form.tsx` — lines 163–169
- `src/components/admin/admin-confirm-action-form.tsx` — lines 16–27
- `src/components/account/account-cancel-booking-form.tsx` — lines 14–26
- `src/components/trainer/trainer-cancel-booking-form.tsx` — lines 12–23

**Proposed API:**
```tsx
<FormSubmitButton
  label="Подтвердить"
  loadingLabel="Загрузка..."
  className="admin-form__submit"
  variant="default"   // "default" | "danger" | "primary"
/>
```

---

## Priority 2 — Medium Impact

### 5. `PriceBreakdown` — line-item price list

**Affected files:**
- `src/components/booking/live-booking-form.tsx` — lines 1274–1287
- `src/components/admin/create-booking-form.tsx` — lines 576–590, 828–832

**Proposed API:**
```tsx
<PriceBreakdown
  lines={[
    { key: "court", label: "Корт × 2", amount: 10000 },
    { key: "trainer", label: "Тренер", amount: 5000 },
  ]}
  total={15000}
/>
```

---

### 6. `StatusMessage` — success / error inline message

**Pattern:**
```tsx
{message ? <p className="...--success" role="status">{message}</p> : null}
{error ? <p className="...--error" role="alert">{error}</p> : null}
```

**Affected files:**
- `src/components/admin/admin-bookings-table.tsx` — lines 91–95
- `src/components/admin/media-upload-form.tsx` — lines 120–129
- `src/components/admin/create-booking-form.tsx` — lines 842–843
- `src/components/booking/live-booking-form.tsx` — lines 1336–1342

**Proposed API:**
```tsx
<StatusMessage variant="success" message={message} />
<StatusMessage variant="error" message={error} />
// or combined:
<StatusMessage success={message} error={error} />
```

---

### 7. `useModal` hook — open/close boolean state

All modal components repeat the same 3-line pattern:
```tsx
const [open, setOpen] = useState(false);
// ... trigger button ...
{open ? <Modal onClose={() => setOpen(false)} /> : null}
```

**Affected files (10+ modal trigger wrappers):**
- `src/components/admin/admin-confirm-action-form.tsx`
- `src/components/account/account-cancel-booking-form.tsx`
- `src/components/trainer/trainer-cancel-booking-form.tsx`
- `src/components/events/public-event-card.tsx`
- `src/components/coaches/coach-gallery-list.tsx`
- `src/components/admin/admin-reschedule-modal.tsx`

**Proposed API:**
```tsx
const { open, show, hide } = useModal();
```

---

### 8. Date formatting — consolidate into `src/lib/format/date.ts`

**Duplicate implementations:**
- `src/components/booking/live-booking-form.tsx` lines 179–194 — `formatShortDate`, `formatShortWeekday`, `getRelativeDateLabel`
- `src/components/admin/create-booking-form.tsx` lines 120–126 — `getTodayDate`

**Action:** Move all helpers into `src/lib/format/date.ts` alongside existing `money.ts`. Import from there in both components.

---

## Priority 3 — Polish / Consistency

### 9. `Section` / `StepSection` — labeled content block

```tsx
// Repeated ~10 times across booking and admin forms
<div className="booking-flow__section">
  <p className="booking-flow__section-label">Шаг 1</p>
  {content}
</div>
```

**Affected files:**
- `src/components/booking/live-booking-form.tsx` — 4 instances
- `src/components/admin/create-booking-form.tsx` — 3 instances

---

### 10. `StatusChip` — booking/payment status badge

```tsx
// In admin-bookings-table.tsx lines 169–177
<span className={`admin-bookings__chip admin-bookings__chip--status-${row.status.replaceAll("_", "-")}`}>
  {row.statusLabel}
</span>
```

Currently inline in one file, but will be needed across more views as booking details expand to other pages.

---

### 11. `SummaryGrid` — label/value pair display

Used for booking details display before confirmation:

**Affected files:**
- `src/components/admin/admin-booking-actions-modal.tsx` — lines 44–60
- `src/components/admin/admin-reschedule-modal.tsx` — lines 182–203
- `src/components/events/public-event-card.tsx` — lines 144–162

**Proposed API:**
```tsx
<SummaryGrid
  items={[
    { label: "Дата", value: "10 мая 2026" },
    { label: "Корт", value: "Корт 1" },
  ]}
/>
```

---

## What NOT to extract yet

- `AdminPageShell` breadcrumbs — already centralized; splitting gains nothing
- Individual tab nav in booking forms — too coupled to local state to generalize cleanly
- `useSelectableTable` hook — only one table uses bulk select; wait for second use case

---

## Where to put new components

| Component | Path |
|---|---|
| `FormField` | `src/components/ui/form-field.tsx` |
| `Dialog` | `src/components/ui/dialog.tsx` |
| `FormSubmitButton` | `src/components/ui/form-submit-button.tsx` |
| `StatusMessage` | `src/components/ui/status-message.tsx` |
| `StatusChip` | `src/components/ui/status-chip.tsx` |
| `SummaryGrid` | `src/components/ui/summary-grid.tsx` |
| `PriceBreakdown` | `src/components/booking/price-breakdown.tsx` |
| `TimeSlotTimetable` | `src/components/booking/time-slot-timetable.tsx` |
| `Section` | `src/components/booking/booking-section.tsx` |
| `useModal` | `src/hooks/use-modal.ts` |
| Date utils | `src/lib/format/date.ts` |
