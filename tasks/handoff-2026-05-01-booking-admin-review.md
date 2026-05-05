# Handoff: 2026-05-01 Booking Hardening and Admin Simplification

This document summarizes all work done today so another agent can review the current diff efficiently.

## User Requests

- Read README/project info and analyze the current booking system for flaws.
- Start improving the admin dashboard because it felt overcomplicated.
- Fix the specific booking flaw: when booking a training session, one trainer could be assigned to multiple courts at the same time.
- Proceed step by step through the booking correctness fixes.

## High-Level Scope

Two phases were completed:

1. Admin simplification and trainer same-time selection fix.
2. Booking correctness hardening across direct booking, holds, public multi-slot checkout, and admin rescheduling.

The current diff includes both phases.

## Admin Simplification

Files:

- `src/components/admin/admin-nav-config.ts`
- `app/admin/page.tsx`
- `app/admin/opening-hours/page.tsx`
- `app/admin/clients/page.tsx`

Changes:

- Normal admins now see only daily operations in the sidebar:
  - `Дашборд`
  - `Расписание`
  - `Бронирования`
  - `Клиенты`
- Super admins still see setup, finance, and audit destinations:
  - trainers, courts, exceptions, wallet, opening hours, sports, audit.
- Dashboard quick actions now hide exception/pricing links from normal admins.
- `/admin/opening-hours` now uses `assertSuperAdmin()` for page access and save action access.
- Fixed an existing clients-page lint issue:
  - removed an unused normal-admin `session` variable,
  - replaced an HTML `<a>` reset link with Next `Link`.

Review focus:

- Confirm the role split matches intended business rules.
- Confirm hidden super-admin routes that remain linkable directly are guarded where needed.
- Check whether `/admin/exceptions`, `/admin/wallet`, `/admin/sports`, etc. already have matching super-admin guards or should be tightened in a follow-up.

## Training Same-Time Multi-Court Fix

Files:

- `src/components/booking/live-booking-form.tsx`
- `src/components/admin/create-booking-form.tsx`
- `app/admin/bookings/create/page.tsx`
- `src/lib/bookings/persistence.ts`
- `tests/integration/booking-persistence.test.ts`
- `tests/e2e/02-training-booking.spec.ts`

Changes:

- Public booking UI: when service kind is training, selecting a court at a start time replaces any existing selected court at the same start time.
- Admin create-booking UI: same rule for instructor-backed services.
- Added defensive cleanup effects so switching into training collapses duplicate same-time selected cells.
- Admin server action rejects duplicate start times for instructor-backed services.
- Grouped hold creation rejects duplicate start times for instructor-backed services.
- Integration coverage added:
  - `rejects grouped training holds with one trainer on multiple courts at the same time`.

Review focus:

- Verify the UI replacement behavior is clear enough for users.
- Confirm backend duplicate-time checks cover every instructor-backed creation path.
- Confirm the rule should apply per trainer, not globally across all trainers. Current path has a single selected instructor, so duplicate same-time means one trainer across multiple courts.

## Shared Server-Side Availability Validator

New file:

- `src/lib/bookings/availability-validator.ts`

Call sites:

- `src/lib/bookings/persistence.ts`
- `src/lib/bookings/reschedule.ts`

The validator now centralizes mutation-time checks that were previously mostly enforced by `/api/availability` only.

Checks included:

- Court exists, active, same location, matching sport.
- Instructor exists, active, teaches the sport, assigned to the location.
- Location opening hours allow the requested slot.
- Venue/court/instructor schedule exceptions do not block the slot.
- Instructor schedule allows the slot, including week-specific override behavior.
- Existing active bookings do not overlap.
- Existing active holds do not overlap, with an optional owned/matching hold exclusion.

Review focus:

- Compare `availability-validator.ts` behavior with `src/lib/availability/db.ts` to ensure no policy drift.
- Pay attention to schedule exception overlap and instructor week override behavior.
- Confirm all mutation paths that can create or move bookings call the validator.
- Confirm error messages are acceptable for public/admin users.

## Hold Ownership and Conflict Ordering

File:

- `src/lib/bookings/persistence.ts`

Problem found:

- The previous code excluded `input.holdId` from hold conflict checks before proving that the hold belonged to the current customer and matched the requested slot/resources.
- A forged or foreign hold ID could bypass an active hold conflict.

Changes:

- Added `resolveValidatedActiveHold(...)`.
- Creation paths now:
  - resolve/create customer first,
  - fetch the hold by `holdId` and current `customerId`,
  - validate service/location/resources/start/end,
  - only then exclude `activeHold.id` from overlap checks.
- Foreign, expired, converted, or mismatched holds are not excluded.

Coverage:

- `does not let a foreign hold id bypass an active hold conflict`.

Review focus:

- Confirm no path still passes raw user-provided `holdId` directly into conflict exclusion.
- Confirm converted/expired holds cannot be reused.

## Direct Booking Creation Hardening

Files:

- `src/lib/bookings/persistence.ts`
- `src/lib/validation/booking.ts`
- `tests/integration/booking-persistence.test.ts`

Changes:

- `createBookingInDb` now uses shared availability validation before pricing/payment/booking creation.
- This closes direct POST bypasses around:
  - opening hours,
  - venue exceptions,
  - court/instructor compatibility,
  - instructor schedule,
  - active holds.

Coverage:

- `rejects direct booking outside opening hours`.
- `rejects direct booking during a venue schedule exception`.

Review focus:

- Check whether direct booking route error statuses/messages are still appropriate.
- Confirm admin-created bookings still allow intended settlement modes after validation.

## Admin Rescheduling Hardening

File:

- `src/lib/bookings/reschedule.ts`

Changes:

- Reschedule now calls shared validator before updating the booking.
- Reschedule now checks:
  - destination court compatibility,
  - opening hours,
  - schedule exceptions,
  - trainer schedule,
  - active booking conflicts,
  - active hold conflicts.
- Old duplicate conflict queries were removed after the shared validator became authoritative.

Coverage:

- Existing past-time reschedule test still passes.
- Added `rejects rescheduling into an active hold`.

Review focus:

- Validate price recalculation remains correct after moving validation earlier.
- Confirm holds should block admin reschedule. Current behavior says yes.
- Check whether admin should have an override path in the future; none was added.

## Atomic Public Multi-Slot Checkout

New route:

- `app/api/bookings/series/route.ts`

Files:

- `src/lib/bookings/persistence.ts`
- `src/lib/validation/booking.ts`
- `src/components/booking/live-booking-form.tsx`

Problem found:

- Public multi-slot booking previously looped client-side and posted each booking separately.
- If balance/pricing/state changed mid-loop, a customer could get a partial series.

Changes:

- Added `createBookingSeriesSchema`.
- Added `createBookingSeriesInDb(input)`.
- Added `/api/bookings/series`.
- Public form now submits selected cells once to `/api/bookings/series`.
- `createBookingSeriesInDb` validates all slots and total wallet balance inside one transaction before creating any booking.
- If wallet balance is insufficient, no bookings are created.
- Route catches insufficient balance and creates temporary holds via existing grouped hold logic, returning `402` with:
  - `INSUFFICIENT_WALLET_BALANCE_SERIES`,
  - current balance,
  - total required,
  - shortfall,
  - hold data.
- Public UI maps returned holds back to selected cells and preserves the top-up return flow.

Coverage:

- `does not create a partial customer series when wallet balance is insufficient`.
- Targeted E2E `07-wallet-topup-resume` passes with the new series endpoint.

Review focus:

- Check transaction shape in `createBookingSeriesInDb`.
- Confirm all bookings in a series should debit wallet one booking at a time after the total precheck.
- Confirm notification behavior is acceptable: notifications are sent after transaction for each created booking.
- Confirm response shape from `/api/bookings/series` works for all public UI cases.

## Seed Repair

File:

- `prisma/seed.ts`

Problem:

- `npm run db:seed` was blocked by stale legacy tables not present in the current Prisma schema:
  - `AppointmentGroupV2`
  - then `AppointmentBlockV2`
  - schema inspection also found additional related V2 tables.

Changes:

- Added guarded cleanup for legacy V2 tables in dependency order:
  - `AppointmentTimelineEventV2`
  - `AppointmentResourceV2`
  - `AppointmentServiceLineV2`
  - `AppointmentV2`
  - `AppointmentBlockV2`
  - `AppointmentGroupV2`
  - `ClientProfileV2`

Review focus:

- Confirm this cleanup is acceptable for local/dev seed only.
- Consider whether stale V2 tables should be formally dropped in a migration instead of only seed-cleaned.

## Test Updates

Files:

- `tests/integration/booking-persistence.test.ts`
- `tests/e2e/helpers.ts`
- `tests/e2e/02-training-booking.spec.ts`
- `tests/e2e/12-admin-multi-booking.spec.ts`

Integration coverage added:

- Foreign hold ID cannot bypass active hold conflict.
- Direct booking outside opening hours is rejected.
- Direct booking during venue schedule exception is rejected.
- Rescheduling into active hold is rejected.
- Grouped training hold with one trainer on multiple courts at same time is rejected.
- Atomic customer series does not create partial bookings when wallet balance is insufficient.

E2E updates:

- Training booking test updated for current `booking-flow__*` UI classes and wallet top-up requirement.
- E2E helper now marks newly registered test users verified if registration lands on `/register/verify`, then logs in. This avoids unavailable email/Telegram services blocking tests.
- Slot helpers updated for current timetable cells.
- Admin multi-booking test stabilized date input setting with direct input/change event dispatch.

Review focus:

- Check whether the E2E helper DB update is acceptable test-only behavior.
- Consider applying the date input stabilization to other admin E2E tests that still use `.fill()` on `#cb-date`.

## Task Tracking and Lessons

Files:

- `tasks/todo.md`
- `tasks/lessons.md`

Changes:

- Added and completed the 2026-05-01 plan/review entries.
- Added lessons:
  - instructor-backed bookings treat instructor as scarce across selected courts,
  - mutation paths must enforce availability rules, not only read/availability endpoints.

## Verification Run

Passed:

- `npm run lint`
  - Passed with existing warnings only:
    - `<img>` warnings in variation pages and instructor photo input.
    - unused `todayIso` warning in trainer schedule page.
- `npm run build`
- `npm run db:seed`
- `npm run test:unit -- tests/unit/booking-validation.test.ts tests/unit/availability-engine.test.ts tests/unit/booking-holds.test.ts tests/unit/booking-policy.test.ts`
  - 6 files, 20 tests.
- `npm run test:integration -- tests/integration/booking-persistence.test.ts`
  - because the integration script runs all integration tests, result was 3 files, 24 tests.
- `npm run test:e2e -- tests/e2e/02-training-booking.spec.ts tests/e2e/07-wallet-topup-resume.spec.ts tests/e2e/12-admin-multi-booking.spec.ts`
  - 3 tests passed.
- `git diff --check`
  - Passed. Only line-ending warnings were reported.

Temporary failures fixed during work:

- Build initially failed because the public booking form could not narrow series success versus insufficient-funds payloads. Fixed by checking `bookings` in `payload.data`.
- `db:seed` initially failed on legacy V2 foreign keys. Fixed with guarded legacy cleanup.
- E2E initially failed because registration now requires verification when email/Telegram are unavailable. Fixed in test helper.
- E2E training slot helper initially waited on stale `booking-live__*` nested selectors. Fixed helper to support current timetable UI.
- Admin multi-booking E2E had a flaky date input `.fill()` path. Stabilized the targeted test.

## Complete File List in Current Diff

Modified:

- `app/admin/bookings/create/page.tsx`
- `app/admin/clients/page.tsx`
- `app/admin/opening-hours/page.tsx`
- `app/admin/page.tsx`
- `prisma/seed.ts`
- `src/components/admin/admin-nav-config.ts`
- `src/components/admin/create-booking-form.tsx`
- `src/components/booking/live-booking-form.tsx`
- `src/lib/bookings/persistence.ts`
- `src/lib/bookings/reschedule.ts`
- `src/lib/validation/booking.ts`
- `tasks/lessons.md`
- `tasks/todo.md`
- `tests/e2e/02-training-booking.spec.ts`
- `tests/e2e/12-admin-multi-booking.spec.ts`
- `tests/e2e/helpers.ts`
- `tests/integration/booking-persistence.test.ts`

Added:

- `app/api/bookings/series/route.ts`
- `src/lib/bookings/availability-validator.ts`
- `tasks/handoff-2026-05-01-booking-admin-review.md`

## Suggested Review Order

1. `src/lib/bookings/availability-validator.ts`
2. `src/lib/bookings/persistence.ts`
3. `app/api/bookings/series/route.ts`
4. `src/components/booking/live-booking-form.tsx`
5. `src/lib/bookings/reschedule.ts`
6. Admin simplification files
7. Tests

## Known Follow-Ups Not Done Today

- Deeper admin dashboard simplification is still pending, especially `/admin/bookings`, which remains dense.
- Consider formal migration cleanup for stale V2 appointment tables.
- Consider broadening E2E date-input stabilization to all admin create-booking tests.
- Consider whether admin reschedule should ever override holds/exceptions; current behavior blocks them.
