# Next Session Handoff / Prompt

This document is a ready-to-use handoff for the next development session.

## Current State (At a Glance)

The app is now a working local MVP with:

- DB-backed booking + availability
- customer registration/login/account bookings
- 6-hour free cancellation (configurable)
- admin CRUD for courts/instructors/services/schedules/exceptions/bookings
- trainer-specific pricing and trainer selection in booking flow
- hour-based one-hour slots only
- court rentals require authenticated account

## Important Before You Start (Local)

Latest schema changes require migration and reseed.

### Required commands

1. Stop any running `next dev` process
2. Apply DB migration:

```powershell
npx prisma migrate dev --name trainer_pricing_and_booking_auth
```

3. Regenerate Prisma Client:

```powershell
npx prisma generate
```

4. Reseed local DB:

```powershell
npm run db:seed
```

5. Start app:

```powershell
npm run dev
```

## Known Operational Caveats

- Windows Prisma `EPERM` file-lock on `query_engine-windows.dll.node` can happen if `next dev` is running during `prisma generate`.
- Demo fallback is intentionally disabled by default:
  - `ALLOW_DEMO_FALLBACK=false`
  - This is to avoid fake-success bookings that do not persist.

## What Was Just Completed (Latest Iteration)

- Booking UX refactor to:
  - `sport -> service type -> date -> per-court timeslots`
- Hour-only slots (`HH:00`)
- Trainer selection + trainer-specific pricing + price preview
- Nearest available date auto-shift (14 days)
- Court rentals require login
- Inline trainer price editing in admin
- Silent demo fallback disabled by default

## High-Priority Next Tasks (Recommended Order)

## 1. Payment Integration + Webhooks (Highest Impact)

Goal:

- Replace placeholder payment flow with real provider integration (Kaspi / Freedom)
- Add webhook handlers for payment status updates
- Implement real refund flow for eligible cancellations

Acceptance criteria:

- booking can create provider payment session/URL
- webhook updates `Payment.status` and `Booking.status`
- customer cancellation triggers refund request (where supported)
- idempotent webhook processing

## 2. Admin Editing UX Improvements

Goal:

- Expand inline editing beyond trainer prices:
  - trainer name / bio / sport
  - courts (name/notes)
  - services

Acceptance criteria:

- no page reload confusion
- validation errors visible in UI
- consistent server actions and revalidation

## 3. Booking UX Quality / Reliability

Goal:

- Improve clarity and trust in booking flow

Suggestions:

- explicit “booking source” indicator hidden in production / shown in dev
- slot loading skeletons
- disabled submit while availability stale
- optimistic refresh after booking/cancel
- better trainer card details (bio/level)

## 4. Test Expansion + CI

Goal:

- expand the new automated coverage and wire it into CI

Suggested scope:

- expand integration tests beyond current availability + booking persistence coverage
- add negative e2e cases (auth failures, cancellation cutoff blocked, no slots)
- CI pipeline: lint + build + unit + e2e (or staged e2e subset)

## 5. Production Readiness Hardening

Goal:

- close operational/security gaps

Scope:

- rate limiting on auth and booking endpoints
- audit log for admin mutations
- structured logging / error tracking
- deployment docs
- backup/restore procedures

## Suggested Next Session Prompt (Copy/Paste)

Use this prompt in the next session:

```text
Continue development on D:\\Websites\\padelsquash.

First, read:
- README.md
- docs/devops-postgres.md
- docs/changes-2026-02-23.md
- docs/next-session-handoff.md
- tasks/todo.md
- tasks/lessons.md

Then:
1) verify local DB/schema is up to date (run prisma migrate/generate/seed if needed),
2) implement real payment integration/webhook flow for bookings and refunds,
3) keep existing booking UX behavior (sport -> service type -> date -> per-court slots, trainer selection, hour-only slots),
4) do not re-enable silent demo fallback by default,
5) run lint/build and summarize exact verification.
```

## Suggested Verification Checklist (Next Session)

- `npm run lint`
- `npm run build`
- register/login flow
- court rental booking (auth required)
- training booking with trainer selection and expected price
- slot disappears after booking
- cancellation works with 6-hour cutoff
- admin inline trainer price edit affects booking price preview

## References

- Local DB runbook: `docs/devops-postgres.md`
- Changes summary: `docs/changes-2026-02-23.md`
- Current task/history log: `tasks/todo.md`
- Session lessons: `tasks/lessons.md`

## Update: Automated Tests Implemented

The local automated test baseline is now implemented and passing:

- Unit (`Vitest`):
  - availability engine
  - pricing engine
  - booking validation
  - cancellation policy
- E2E (`Playwright`):
  - customer register -> court booking -> refresh slot disappears -> account cancellation
  - training booking with trainer selection + trainer-specific prices
  - admin booking status action
  - admin inline trainer price editing reflected in booking preview
  - admin settings/resource CRUD and toggles
- Integration/API (`Vitest` + real Postgres):
  - availability route handler DB-backed response + hour-slot validation
  - booking persistence overlap/concurrency behavior
  - trainer-specific pricing effect in persisted training bookings

Commands verified:

- `npm run test:unit` ✅
- `npm run test:integration` ✅
- `npm run test:e2e` ✅

Important notes:

- Playwright config uses `http://localhost:3000` to match `NEXTAUTH_URL` (avoids Auth.js cookie/session issues seen with `127.0.0.1`).
- E2E runs reseed the local DB before execution (`npm run test:e2e`).
- Integration tests also reseed the local DB (`npm run test:integration`).

## Update: Public Content Refactor Implemented

- Public-site copy is now centralized in `src/lib/content/site-content.ts`.
- `src/lib/demo/hardcoded-data.ts` is now reserved for demo fallback operational data (availability/pricing/services) and no longer mixes marketing copy with fallback logic.
- Public pages no longer show technical/internal/testing language (e.g. MVP/admin/test instructions) in customer-facing sections.
