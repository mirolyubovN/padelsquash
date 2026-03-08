# Admin Customer UX Batch (2026-03-08)

## Plan

- [x] Audit `/admin/wallet` and `/admin/bookings` client-flow gaps.
- [x] Add admin/super-admin actions to edit customer email/phone safely.
- [x] Add admin/super-admin action to force customer password reset.
- [x] Add direct customer -> bookings navigation from wallet and bookings table.
- [x] Verify with typecheck, lint, and focused e2e.
- [x] Update documentation with shipped behavior.

## Review

- `/admin/wallet` now supports:
  - customer contact updates (email + phone)
  - forced password reset with immediate new activation-link availability
  - role-safe customer targeting (`role: "customer"` guards for selection and mutations)
  - direct customer bookings link and quick "manage customer" entry point
- `/admin/bookings` now supports exact customer deep-linking via `customerEmail` query parameter.
- Customer name/email in booking rows now act as one-click filters to that specific customer.
- Verification:
  - `npx.cmd tsc --noEmit` passed
  - `npx.cmd eslint app/admin/wallet/page.tsx app/admin/bookings/page.tsx src/lib/admin/bookings.ts tests/e2e/09-admin-wallet-customers.spec.ts tests/e2e/helpers.ts` passed
  - `npx.cmd playwright test tests/e2e/09-admin-wallet-customers.spec.ts` passed

## Follow-up (wallet popup + booking parity)

- Replaced long inline "client profile" editing on `/admin/wallet` with per-row popup modal (`AdminEditModal`) so `"Управлять клиентом"` opens in-place.
- Extended `/admin/bookings/create` UX to mirror client flow for operators:
  - explicit sport/service/trainer/date selection
  - explicit timeslot + court selection in one step (no hidden auto-court)
  - visible customer balance with live lookup by email
- Added admin payment mode choice for manual bookings:
  - `auto`: wallet if sufficient, otherwise cash/manual
  - `wallet`: wallet-only with hold/top-up retry
  - `cash`: manual booking without wallet debit
- Added API endpoint `/api/admin/customers/by-email` for admin-side balance preview in booking create flow.
- Updated e2e coverage to assert popup behavior for `"Управлять клиентом"`.
- Follow-up verification:
  - `npx.cmd tsc --noEmit` passed
  - `npx.cmd eslint app/admin/wallet/page.tsx app/admin/bookings/create/page.tsx src/components/admin/create-booking-form.tsx src/lib/bookings/persistence.ts app/api/admin/customers/by-email/route.ts tests/e2e/08-admin-wallet-booking.spec.ts tests/e2e/09-admin-wallet-customers.spec.ts tests/e2e/10-admin-calendar-prefill.spec.ts` passed
  - `npm.cmd run test:integration -- tests/integration/booking-persistence.test.ts` passed
  - `npx.cmd playwright test tests/e2e/08-admin-wallet-booking.spec.ts tests/e2e/09-admin-wallet-customers.spec.ts tests/e2e/10-admin-calendar-prefill.spec.ts` passed
