# Session Todo (2026-02-23)

## Plan

- [x] Read `prompt.md` session brief and inspect current repo scaffold.
- [x] Read local Next.js docs references for App Router pages/layouts and route handlers.
- [x] Add project foundation files for backend domain (Prisma schema, seed skeleton, core types/services).
- [x] Replace default Next.js UI with Russian-only public site shell and BEM + Tailwind `@apply` styling.
- [x] Add config/docs scaffolding (`.env.example`, README updates, progress notes).
- [x] Run available verification and record results.
- [x] Replace remaining admin placeholder pages (`courts`, `instructors`, `services`, `exceptions`) with DB-backed lists + create/toggle forms.
- [x] Implement DB-backed management for instructor schedules and court/instructor/venue exceptions (server actions + validation).
- [x] Verify admin pages compile and flows pass lint/build.

## Notes

- Goal for this session: establish a production-grade foundation and app structure that subsequent sessions can extend into full booking/admin flows.
- Keep changes minimal but forward-compatible with the full prompt requirements.
- Later scope update applied: simplify booking sessions to fixed 60 minutes and replace rule-based pricing with a fixed component price matrix (`sport x component x period`).

## Review

- Prisma schema refactored to simplified model:
  - removed redundant service duration/buffer fields
  - removed `BasePrice` and `PriceRule`
  - added `ComponentPrice` matrix table and `Service.code`
- DB-backed implementations added for:
  - `/admin/opening-hours` (Server Action + Prisma)
  - `/admin/pricing/base` (Server Action + Prisma)
  - `/prices` (reads pricing matrix from DB)
  - `GET /api/availability` (DB-first with demo fallback)
  - `POST /api/bookings` (DB-first, pricing matrix, concurrency guard, placeholder payments)
  - `POST /api/payments/placeholder/mark-paid` (real DB update)
- `npm run lint` ✅
- `npm run build` ✅
- `npm run db:generate` could not run in this sandbox because Prisma engine download is network-blocked; run locally after schema changes.
- Dockerized local Postgres is now provisioned and initialized (Compose + migration + seed on host port `55432`).
- Added DevOps/Postgres runbook: `docs/devops-postgres.md`.
- Added Auth.js credentials login and server-side admin protection, plus DB-backed admin booking actions.

### In Progress (next slice)

- Converting remaining admin resource pages from demo tables to Prisma-backed server-action pages.
- Goal: keep the simplified business model (60-minute sessions, fixed pricing matrix) and avoid reintroducing rule/duration complexity.
- Status: completed for `courts`, `instructors`, `services`, `exceptions` and related subpages (`court exceptions`, `instructor schedule`).

### Review (admin resources slice)

- Added shared admin resource management module with Zod validation and Prisma writes:
  - `src/lib/admin/resources.ts`
- Replaced placeholder admin pages with DB-backed server-action pages:
  - `app/admin/courts/page.tsx`
  - `app/admin/instructors/page.tsx`
  - `app/admin/services/page.tsx`
  - `app/admin/exceptions/page.tsx`
  - `app/admin/courts/[id]/exceptions/page.tsx`
  - `app/admin/instructors/[id]/schedule/page.tsx`
- Admin features now supported:
  - create/toggle courts
  - create/toggle instructors
  - create/toggle services (simplified 60-minute service model)
  - create/delete venue/court/instructor exceptions
  - create/toggle/delete instructor weekly schedule intervals
- `npm run lint` ✅
- `npm run build` ✅

### Review (customer account/auth slice)

- Added customer route guard and protected account layout:
  - `src/lib/auth/guards.ts` (`requireAuthenticatedUser`)
  - `app/account/layout.tsx`
- Added DB-backed customer account bookings service with cancellation policy enforcement (later updated to configurable 6h free-cancellation rule):
  - `src/lib/account/bookings.ts`
- Replaced account placeholders with authenticated DB-backed pages:
  - `app/account/page.tsx`
  - `app/account/bookings/page.tsx`
- Added customer registration page (credentials auth) with support for converting booking-created guest users into real accounts by setting a password:
  - `app/register/page.tsx`
- Updated login page links to include customer registration:
  - `app/login/page.tsx`
- Added account shell/profile/history styles:
  - `app/globals.css`
- Updated customer free cancellation policy to 6 hours (configurable) and added no-charge behavior by marking paid payments as `refunded` on eligible customer cancellation:
  - `src/lib/bookings/policy.ts`
  - `src/lib/account/bookings.ts`
  - `.env.example`
- Replaced `/book` placeholder text with a real API-backed booking UI (availability check + slot selection + booking creation):
  - `app/book/page.tsx`
  - `src/components/booking/live-booking-form.tsx`
  - `app/globals.css`
- Refined booking UX to user-requested flow (`sport -> service type -> date -> per-court slots`) and switched availability/booking validation to hour-based slots only (`09:00-10:00`, not `09:15-10:15`):
  - `src/components/booking/live-booking-form.tsx`
  - `app/book/page.tsx`
  - `src/lib/availability/engine.ts`
  - `app/api/availability/route.ts`
  - `src/lib/validation/booking.ts`
  - `src/lib/bookings/persistence.ts`
- Added trainer-specific pricing and trainer selection in booking flow (price preview now depends on selected trainer):
  - `prisma/schema.prisma`
  - `prisma/seed.ts`
  - `app/book/page.tsx`
  - `src/components/booking/live-booking-form.tsx`
  - `src/lib/pricing/engine.ts`
  - `src/lib/bookings/persistence.ts`
  - `src/lib/availability/db.ts`
  - `app/admin/instructors/page.tsx`
  - `src/lib/admin/resources.ts`
- Enforced authenticated account requirement for court rentals and disabled silent demo fallback by default (prevents fake-success bookings that don’t block availability):
  - `app/api/bookings/route.ts`
  - `app/api/availability/route.ts`
  - `app/book/page.tsx`
  - `src/components/booking/live-booking-form.tsx`
  - `.env.example`
- Added inline editing for trainer prices in admin list:
  - `app/admin/instructors/page.tsx`
  - `src/lib/admin/resources.ts`
- `npm run lint` ✅
- `npm run build` ✅

### Review (automated tests)

- Added unit tests for core business logic:
  - `tests/unit/availability-engine.test.ts`
  - `tests/unit/pricing-engine.test.ts`
  - `tests/unit/booking-policy.test.ts`
  - `tests/unit/booking-validation.test.ts`
- Added Playwright e2e coverage for core customer/admin flows:
  - customer register -> court booking -> refresh slot hidden -> account cancellation
  - training booking with trainer selection + trainer-specific pricing
  - admin booking status update
  - admin inline trainer pricing edit reflected in booking preview
  - admin config/resource CRUD/toggle flows (opening hours, pricing matrix, courts, instructors, services, exceptions)
- Added test tooling/config:
  - `vitest.config.mts`
  - `playwright.config.ts`
  - `tests/e2e/helpers.ts`
  - `package.json` test scripts (`test`, `test:unit`, `test:e2e`)
- Fixed runtime bug uncovered by e2e:
  - advisory lock query in `src/lib/bookings/concurrency.ts` must use `$executeRaw` (not `$queryRaw`) because `pg_advisory_xact_lock()` returns `void`.
- Verification:
  - `npm run test:unit` ✅
  - `npm run test:e2e` ✅
  - `npm run lint` ✅
  - `npm run build` ✅

### Review (API/integration tests + content source refactor)

- Added DB-backed integration/API tests:
  - `tests/integration/availability-api-route.test.ts` (route handler + DB-backed availability)
  - `tests/integration/booking-persistence.test.ts` (overlap blocking, trainer-specific pricing, concurrent conflict serialization)
- Extended test scripts and Vitest config:
  - `package.json` now includes `test:integration` / `test:integration:watch`
  - `vitest.config.mts` now covers `tests/**/*.test.ts`
  - `tests/setup-env.ts` loads `.env` for Vitest/Prisma
- Improved booking reliability uncovered by integration tests:
  - `src/lib/bookings/concurrency.ts` retries serializable write-conflict/deadlock failures (up to 3 attempts)
  - `src/lib/prisma.ts` suppresses Prisma logs in `NODE_ENV=test` for cleaner retry-test output
- Refactored public-site content into a single source-of-truth module:
  - `src/lib/content/site-content.ts` (customer-facing copy + page content + shared catalog content)
  - `src/lib/content/site-data.ts` now re-exports from `site-content`
  - `src/lib/demo/hardcoded-data.ts` now contains demo fallback operational data only (pricing/availability/services)
- Reworked public pages/components to remove technical/dummy copy and consume real customer-facing content:
  - `app/page.tsx`
  - `app/courts/page.tsx`
  - `app/coaches/page.tsx`
  - `app/prices/page.tsx`
  - `app/contact/page.tsx`
  - `app/book/page.tsx`
  - `src/components/booking-form-preview.tsx`
  - `app/layout.tsx`
- Verification:
  - `npm run test:unit` ✅
  - `npm run test:integration` ✅
  - `npm run test:e2e` ✅
  - `npm run lint` ✅
  - `npm run build` ✅
