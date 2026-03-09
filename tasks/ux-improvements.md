# UX Improvements — Implementation Plan & Status

## Overview

Comprehensive UX review of the padel/squash booking platform. Items grouped into 4 independently shippable phases targeting: operational safety, user feedback, data integrity, and advanced workflow features.

---

## Phase 1: Safety & Trust ✅ DONE

### 1.1 Confirmation Dialogs for Destructive Admin Actions ✅

**Problem:** Cancel booking, delete court/instructor — all submitted immediately with no warning.

**Solution:** Wrapped bare cancel buttons with `AdminConfirmActionForm` component.

**Changes:**
- `app/admin/bookings/page.tsx` — restructured action buttons; cancel for `pending_payment` and `confirmed` rows now uses `AdminConfirmActionForm` with dialog + description about wallet refund
- `app/admin/courts/page.tsx` — already used `AdminConfirmActionForm` ✓
- `app/admin/instructors/page.tsx` — already used `AdminConfirmActionForm` ✓

---

### 1.2 Wallet Balance in Booking Form Before Submit ✅

**Problem:** Users see total price but not their balance; discover insufficient funds only after clicking submit.

**Solution:** Display wallet balance in Step 3 (confirmation) of the booking form.

**Changes:**
- `src/components/booking/live-booking-form.tsx` — added balance block between price breakdown and submit area; shows "Ваш баланс: X ₸" and "Не хватает: X ₸" in red when insufficient
- `src/styles/booking.scss` — added `.booking-flow__wallet-info` and `.booking-flow__wallet-info--insufficient`

---

## Phase 2: Data Integrity & Tracking ✅ DONE

### 2.1 Cancellation Reason + cancelledBy Tracking ✅

**Problem:** No record of who cancelled a booking or why.

**Migration:** `20260309120000_booking_cancelled_by_audit_log`
- Added `cancelledBy TEXT`, `cancelledAt TIMESTAMP`, `cancellationReason TEXT` to `Booking` table

**Changes:**
- `prisma/schema.prisma` — 3 new fields on `Booking` model
- `src/lib/bookings/operations.ts` — `cancelBookingWithRefundInTx()` accepts and persists `cancelledBy`, `cancelledAt`, `cancellationReason`
- `src/lib/admin/bookings.ts` — `setBookingStatus()` passes `cancelledBy: "admin"`
- `src/lib/account/bookings.ts` — customer cancellations pass `cancelledBy: "customer"`

---

### 2.2 Audit Log ✅

**Problem:** No trail of admin actions.

**Migration:** `20260309120000_booking_cancelled_by_audit_log`
- Created `AuditLog` table with indexes on `(entityType, entityId, createdAt)`, `(actorUserId, createdAt)`, `(action, createdAt)`

**Changes:**
- `prisma/schema.prisma` — `AuditLog` model
- `src/lib/audit/log.ts` — `logAuditEvent()` fire-and-forget helper (never throws)
- `src/lib/admin/bookings.ts` — logs `booking.cancel` and `booking.status_change` on every status change
- `app/admin/audit/page.tsx` — paginated audit log viewer with filters: entity type, action, date range
- `src/components/admin/admin-nav-config.ts` — added "Журнал действий" → `/admin/audit`

**Supported audit actions:** `booking.cancel`, `booking.status_change`, `booking.payment_change`, `court.*`, `instructor.*`, `sport.*`, `wallet.admin_credit`, `wallet.admin_debit`

---

### 2.3 Hold Expiration Detection ✅

**Problem:** User goes to top up wallet, hold expires, they return to stale selections.

**Changes:**
- `src/components/booking/live-booking-form.tsx`:
  - `holdExpiresAtMs` state — set from earliest `expiresAtIso` in holds API response
  - `holdSecondsLeft` state — computed each second via `setInterval`
  - On expiry: holdIds cleared from selections, error message shown, availability refreshes
  - Timer displayed in Step 3: green normally, red pulsing animation when < 2 minutes remain
- `src/styles/booking.scss` — `.booking-flow__hold-timer` and `.booking-flow__hold-timer--expiring` (pulsing animation)

---

## Phase 3: Workflow Improvements ✅ DONE

### 3.1 Bulk Booking Status Updates ✅

**Problem:** Admin can't select multiple bookings to mark as completed/no-show at end of day.

**Changes:**
- `src/lib/admin/bookings.ts` — `bulkSetBookingStatus()` sequential per-booking updates with error counting; returns `{ updated, failed, total }`
- `src/components/admin/admin-bookings-table.tsx` — new client component extracted from server page:
  - Checkbox column with "select all" (only actionable rows: `confirmed`/`pending_payment`)
  - Floating bulk action bar at bottom when selection > 0: "Завершить" / "Неявка" / "Отменить" / "Сбросить"
  - Each bulk action shows a confirmation dialog before executing
  - Result shown: "Обновлено X из Y бронирований"
- `app/admin/bookings/page.tsx` — uses `AdminBookingsTable`; `bulkUpdateAction` server action
- `src/styles/admin.scss` — `.admin-bookings__bulk-bar`, `.admin-bookings__checkbox`, `.admin-bookings__bulk-count`

---

### 3.2 Booking Reschedule ✅

**Problem:** No way to move a booking — must cancel and rebook, losing refund if past deadline.

**Changes:**
- `src/lib/bookings/reschedule.ts` — `rescheduleBooking()`:
  - Uses `withBookingConcurrencyGuard()` for advisory locks
  - Validates status (no cancel/complete/no_show)
  - Checks court and instructor conflicts (excluding self)
  - Recalculates pricing for new time/tier
  - Adjusts wallet if payment was via wallet (debit extra or credit diff)
  - Updates `startAt`, `endAt`, `priceTotal`, `pricingBreakdownJson`
  - Updates `BookingResource` if court changed
- `src/components/admin/admin-reschedule-modal.tsx` — client component:
  - Date picker → fetches availability from `/api/availability`
  - Slot grid (available times)
  - Court selector if multiple courts available
  - Calls `rescheduleAction` server action on confirm
  - Shows result with price diff
- `app/admin/bookings/page.tsx` — `rescheduleAction` server action (logs to audit); "Перенести" button on `confirmed` rows
- `src/lib/admin/bookings.ts` — `AdminBookingRow` extended with `serviceId`, `locationSlug`, `dateIso`, `requiresCourt`, `courtIds`
- `src/styles/admin.scss` — `.admin-reschedule-modal`, `.admin-reschedule-modal__slots`, `.admin-reschedule-modal__slot`

---

### 3.3 Calendar Week View ✅

**Problem:** Admin can only see one day at a time — no occupancy overview.

**Changes:**
- `src/lib/admin/calendar.ts`:
  - `getMondayOfWeek(date)` — returns ISO date of Monday of that week
  - `getCalendarWeekData(mondayDate, locationSlug?)` — 7-day query, groups bookings by day, computes occupancy per day (0=free, 1=partial, 2=full)
- `app/admin/calendar/page.tsx`:
  - `?view=week` param activates week grid
  - 7-cell grid Mon–Sun, each links to day view for that date
  - Cells: color-coded (white=free, yellow=partial, red=full) + booking/court ratio
  - Week nav: ← Пред. неделя / Текущая неделя / След. неделя →
  - "Вид: неделя" / "Вид: день" toggle buttons in nav
- `src/styles/admin.scss` — `.admin-calendar__week-grid`, `.admin-calendar__week-cell` and modifiers (`--free`, `--partial`, `--full`, `--today`), `.admin-calendar__view-toggle`

---

## Phase 4: Advanced Features

### 4.1 Trainer Portal Improvements ✅

**Problem:** Trainers can only manage schedule — no earnings visibility, no self-service cancellation.

**Changes:**
- `src/lib/trainer/earnings.ts` — `getTrainerEarnings(instructorId, dateFrom, dateTo)`: query completed bookings where instructor is a resource
- `src/lib/notifications/bookings.ts` — `CancellationSource` extended to `"customer" | "admin" | "trainer"`; `buildCancellationSourceLabel` handles `"trainer"` → `"тренером"`
- `src/lib/admin/resources.ts` — `AdminInstructorSessionRow` extended with `startAtIso`; map updated
- `src/components/trainer/trainer-cancel-booking-form.tsx` — client component with reason textarea + confirmation dialog
- `app/trainer/schedule/page.tsx` — earnings section (week/month period toggle, summary card, detail table) + cancel action (`cancelSessionAction` server action validates booking belongs to trainer, in future, status is active)

---

### 4.2 Session Duration Flexibility — SKIPPED (not needed)

---

## Migrations Applied

| Migration | Date | Description |
|-----------|------|-------------|
| 20260309113000_admin_booking_groups | 2026-03-09 | Empty placeholder (no schema changes) |
| 20260309120000_booking_cancelled_by_audit_log | 2026-03-09 | `cancelledBy/At/Reason` on Booking + AuditLog table |

---

---

## Post-Phase Improvements ✅

### Dashboard UX
- "Ожидают оплаты" stat card → clickable `<Link>` to `/admin/bookings?status=pending_payment`
- "Последние бронирования" rows → each links to `/admin/bookings?bookingId={id}`

### Admin Navigation Reorganization
- `/admin/clients` (new) — client list + search, inline balance adjust, create customer, edit contacts, password reset, activation link
- `/admin/wallet` (simplified) — global balance adjust form, bonus settings, recent transactions only
- `/admin/clients/[id]` (expanded) — full client profile with inline wallet management; booking rows link to bookings page
- Nav: "Клиенты" → `/admin/clients`, "Кошелёк" → `/admin/wallet`

### Instructor Profile Page
- `app/admin/instructors/[id]/page.tsx` (new) — instructor info, "График" link, earnings section (super admin only, week/month toggle), sessions table
- `app/admin/instructors/page.tsx` — added "Профиль" + "График" links per row

### Photo Upload for Instructors
- `app/api/admin/upload/route.ts` — POST handler, saves to `public/uploads/instructors/`, returns URL; validates type (JPEG/PNG/WebP/GIF) and size (5 MB max)
- `src/components/admin/instructor-photo-input.tsx` — client component: URL field + file upload button, auto-fills URL on success, circular preview
- All instructor create/edit forms use `InstructorPhotoInput` instead of plain URL input

### Bug Fix
- `next.config.ts` — added `serverExternalPackages: ["nodemailer"]` to fix `child_process` build error on bookings/calendar pages

---

## Key Files Reference

| Area | File |
|------|------|
| Audit log helper | `src/lib/audit/log.ts` |
| Audit admin page | `app/admin/audit/page.tsx` |
| Booking cancel op | `src/lib/bookings/operations.ts` |
| Reschedule op | `src/lib/bookings/reschedule.ts` |
| Bulk status update | `src/lib/admin/bookings.ts` → `bulkSetBookingStatus()` |
| Bookings table (client) | `src/components/admin/admin-bookings-table.tsx` |
| Reschedule modal | `src/components/admin/admin-reschedule-modal.tsx` |
| Calendar week data | `src/lib/admin/calendar.ts` → `getCalendarWeekData()` |
| Trainer earnings | `src/lib/trainer/earnings.ts` → `getTrainerEarnings()` |
| Trainer cancel form | `src/components/trainer/trainer-cancel-booking-form.tsx` |
| Client list page | `app/admin/clients/page.tsx` |
| Client profile page | `app/admin/clients/[customerId]/page.tsx` |
| Wallet page | `app/admin/wallet/page.tsx` (transactions only) |
| Instructor profile | `app/admin/instructors/[id]/page.tsx` |
| Photo upload API | `app/api/admin/upload/route.ts` |
| Photo upload component | `src/components/admin/instructor-photo-input.tsx` |
| Hold timer | `src/components/booking/live-booking-form.tsx` |
