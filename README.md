# Padel & Squash KZ

Kazakhstan-focused padel/squash center platform built with Next.js (App Router), Prisma, PostgreSQL, and Auth.js.

This repository contains:

- public website (Russian UI)
- real booking flow (`sport -> service -> date -> per-court slots`)
- customer account (booking history + cancellation)
- admin panel (settings, resources, schedules, exceptions, bookings)

## Current Status

Working and testable in local development:

- DB-backed availability and booking APIs
- DB-backed admin pages (opening hours, pricing matrix, courts, instructors, services, exceptions, bookings)
- customer registration/login/account pages
- booking flow with trainer selection + trainer-specific pricing

Important current policies:

- sessions are fixed to `60 minutes`
- starts are hour-based only (`09:00`, `10:00`, ...)
- court rentals require authenticated account
- customer free cancellation cutoff is `6` hours (configurable)
- availability/booking demo fallback is disabled by default (`ALLOW_DEMO_FALLBACK=false`)

## Tech Stack

- `Next.js 16` (App Router) + `React 19` + `TypeScript`
- `PostgreSQL` + `Prisma ORM`
- `Auth.js / NextAuth` (Credentials)
- `Zod` for validation
- `Tailwind CSS v4` via `@apply` in CSS only (BEM classes in JSX)
- `Vitest` + `Playwright` for automated tests

## Locale / Business Defaults

- Country: `Kazakhstan`
- Currency: `KZT`
- Venue timezone default: `Asia/Almaty`
- UI language: Russian

## Features (Implemented)

### Public / Customer

- `/book` interactive booking UX:
  - sport selection
  - service type selection (`court` / `training`)
  - date picker with auto-refreshing availability
  - timeslots grouped by court
  - trainer selection for training bookings
  - live price preview (court + selected trainer)
  - nearest available date auto-shift (up to 14 days lookahead)
- `/register` customer registration (Credentials auth)
- `/login` login page
- `/account` profile + booking summary
- `/account/bookings` booking history + cancellation action

### Admin

- `/admin/opening-hours` (DB-backed Server Action)
- `/admin/pricing/base` (DB-backed pricing matrix)
- `/admin/courts` (create / toggle active)
- `/admin/instructors` (create / toggle active / inline trainer price editing)
- `/admin/services` (create / toggle active)
- `/admin/exceptions` (venue/court/instructor exceptions)
- `/admin/courts/[id]/exceptions`
- `/admin/instructors/[id]/schedule`
- `/admin/bookings` (cancel / completed / no_show / confirm payment)

### Backend / Domain

- DB-first `GET /api/availability`
- DB-first `POST /api/bookings`
- `POST /api/payments/placeholder/mark-paid`
- availability engine (opening hours, schedules, exceptions, overlap checks)
- pricing engine (period-based with trainer-specific override support)
- concurrency guard for booking race prevention (`SERIALIZABLE` + advisory locks)
- placeholder payment provider + provider abstraction (Kaspi/Freedom stubs)

## Project Structure

### Top Level

- `app/` App Router pages and route handlers
- `src/` application code (components, domain logic, services)
- `prisma/` Prisma schema, migrations, seed
- `docs/` project docs / runbooks / handoff docs
- `tasks/` session notes, lessons, todo tracking
- `types/` local type augmentations
- `docker-compose.yml` local Postgres (Docker Desktop)
- `auth.ts` Auth.js config

### Key Paths

- `app/book/page.tsx`
  - server-side data wiring for booking page (`services`, `courts`, `trainers`, pricing)
- `src/components/booking/live-booking-form.tsx`
  - client-side booking UX and API calls
- `app/api/availability/route.ts`
  - availability endpoint (DB-first; demo fallback only when enabled)
- `app/api/bookings/route.ts`
  - booking creation endpoint with auth rule for court rentals
- `src/lib/availability/engine.ts`
  - hour-based slot generation + availability checks
- `src/lib/bookings/persistence.ts`
  - DB booking creation + overlap check + pricing + payment row creation
- `src/lib/bookings/policy.ts`
  - customer cancellation cutoff policy (`CUSTOMER_FREE_CANCELLATION_HOURS`)
- `src/lib/account/bookings.ts`
  - customer account bookings list + cancellation logic
- `src/lib/pricing/engine.ts`
  - pricing tier resolution + total calculation
- `src/lib/content/site-content.ts`
  - single source of truth for public-site content (heroes, page copy, court/trainer marketing data, pricing notes)
- `src/lib/demo/hardcoded-data.ts`
  - demo fallback operational data only (availability/pricing/services), separate from public-site content
- `src/lib/admin/resources.ts`
  - DB-backed admin resource CRUD helpers + validation
- `src/lib/settings/service.ts`
  - opening hours + component pricing admin settings
- `src/lib/prisma.ts`
  - Prisma client wrapper (lazy singleton)
- `prisma/schema.prisma`
  - DB schema (services, courts, instructors, schedules, exceptions, bookings, payments)
- `prisma/seed.ts`
  - sample courts, instructors, services, opening hours, prices, schedules

### App Route Overview (selected)

- Public:
  - `/`
  - `/courts`
  - `/coaches`
  - `/prices`
  - `/contact`
  - `/book`
  - `/login`
  - `/register`
- Account:
  - `/account`
  - `/account/bookings`
- Admin:
  - `/admin`
  - `/admin/bookings`
  - `/admin/courts`
  - `/admin/instructors`
  - `/admin/services`
  - `/admin/opening-hours`
  - `/admin/pricing/base`
  - `/admin/exceptions`

## Quick Start (Recommended: Docker + Postgres)

Detailed runbook: `docs/devops-postgres.md`

### 1. Install dependencies

```bash
npm install
```

### 2. Create local env file

PowerShell:

```powershell
Copy-Item .env.example .env
```

### 3. Start local PostgreSQL (Docker Desktop)

```powershell
docker compose up -d postgres
```

### 4. Apply migrations

If you are starting from current schema and recent changes:

```powershell
npx prisma migrate dev --name trainer_pricing_and_booking_auth
```

### 5. Generate Prisma client

```powershell
npx prisma generate
```

Windows note:
- If you get `EPERM` on Prisma engine DLL rename, stop `next dev` / Node processes that may be locking Prisma files and rerun.

### 6. Seed demo/dev data

```powershell
npm run db:seed
```

Seeded admin account (default):

- Email: `admin@example.com`
- Password: `Admin123!`

### 7. Start app

```powershell
npm run dev
```

## Environment Variables

See `.env.example`.

Key variables:

- `DATABASE_URL`
  - Postgres connection string
- `NEXTAUTH_SECRET`
  - required for Auth.js session signing
- `NEXTAUTH_URL`
  - local URL (usually `http://localhost:3000`)
- `APP_TIMEZONE`
  - default `Asia/Almaty`
- `PAYMENTS_ENABLED`
  - `false` = bookings become confirmed/paid in placeholder mode
  - `true` = placeholder payment creates pending payment flow
- `CUSTOMER_FREE_CANCELLATION_HOURS`
  - default `6`
- `ALLOW_DEMO_FALLBACK`
  - default `false`
  - if `true`, availability/booking APIs can fall back to demo behavior when DB path fails
- `SEED_ADMIN_*`
  - seeded admin credentials and profile

## Booking Flow Rules (Current)

### Sessions

- Fixed `60 minutes` only
- Starts on whole hours only (`HH:00`)

### Booking Types

- `court` (rental):
  - requires authenticated account
- `training`:
  - requires court + trainer
  - user selects trainer in booking UI
  - final price depends on selected trainer

### Pricing

- Court price:
  - fixed by `sport x period`
- Trainer price:
  - stored per instructor (`morning`, `day`, `evening_weekend`)
- Training total:
  - `court price + selected trainer price`

### Cancellation

- Customer can cancel no-charge up to configured cutoff (`6h` default)
- Eligible cancellation marks booking `cancelled`
- If payment status is `paid`, payment is marked `refunded` (DB status)

## End-to-End Test Flow (Local)

### Court Rental (requires account)

1. Register at `/register`
2. Login at `/login`
3. Open `/book`
4. Select sport + `Аренда корта`
5. Pick date and slot
6. Confirm booking
7. Refresh `/book` and verify the same court/time is no longer available
8. Open `/account/bookings` and verify booking appears

### Training Booking (trainer selection)

1. Ensure trainers have schedules in admin:
   - `/admin/instructors/[id]/schedule`
2. Open `/book`
3. Select sport + `Тренировка`
4. Pick slot
5. Select trainer (price differs by trainer)
6. Confirm booking

## Automated Tests

### Installed Test Stack

- `Vitest` for unit tests
- `Playwright` for browser e2e tests

### Important Hostname Note (Auth.js)

- Keep Playwright and the app on `localhost` (not `127.0.0.1`) to match `NEXTAUTH_URL` and avoid session/cookie auth issues in e2e tests.

### One-Time Browser Install (Playwright)

```powershell
npx playwright install chromium
```

### Run Tests

```powershell
npm run test:unit
npm run test:integration
npm run test:e2e
```

- `npm run test:integration` reseeds the local database before DB-backed Vitest integration tests.
- `npm run test:e2e` reseeds the local database before Playwright e2e tests.

### Current Automated Coverage (Implemented)

- Unit:
  - availability engine (hour alignment, overlap removal, trainer schedule filtering)
  - pricing engine (tiers + trainer override)
  - booking validation (hour-only starts, fixed 60 min)
  - cancellation policy cutoff logic
- Integration / API (Vitest + real DB):
  - availability route handler (`/api/availability`) DB-backed response + hour-only slot output
  - booking persistence overlap prevention
  - trainer-specific pricing in persisted bookings
  - concurrent booking conflict serialization (one success / one failure)
- E2E:
  - customer registration -> court booking -> slot disappears after refresh -> account cancellation
  - guest training booking with trainer selection + trainer-specific pricing
  - admin booking status update
  - admin inline trainer pricing edit reflected in booking preview
  - admin settings/resource flows (opening hours, pricing matrix, courts, instructors, services, exceptions)

## Prisma / Database Notes

- Prisma schema is in `prisma/schema.prisma`
- Migrations are committed under `prisma/migrations/`
- Seed script resets and repopulates dev data (`prisma/seed.ts`)
- This repo currently includes at least one committed migration (`simplify_pricing_matrix`)
- If your local DB is behind recent schema changes (e.g. trainer pricing on `Instructor`), run a new migration locally

### Common Windows Prisma Issue (`EPERM`)

Prisma can fail to replace `query_engine-windows.dll.node` if a process is locking it.

Fix:

1. Stop `next dev`
2. Stop Prisma Studio (if running)
3. Rerun:
   - `npx prisma generate`

## Docs Index

- `docs/devops-postgres.md` - local Docker + PostgreSQL + Prisma runbook
- `docs/changes-2026-02-23.md` - detailed implementation/change log for current work
- `docs/next-session-handoff.md` - next-session tasks, risks, and ready-to-copy prompt
- `docs/production-readiness-checklist.md` - launch gate checklist (infra, DB, auth, booking integrity, payments, tests, ops)

## Known Gaps / Not Yet Production-Ready

- Real payment provider integration/webhooks (Kaspi/Freedom)
- Real refund API integration (currently DB status only)
- Full RBAC coverage / audit logging
- More complete admin editing UX (inline edit exists for trainer prices only)
- CI pipeline to run lint/build/tests automatically
- Monitoring/observability, error tracking, backup/restore procedures
- Deployment infrastructure docs (beyond local Docker DB runbook)

## Commands Reference

```bash
npm run dev
npm run build
npm run lint
npm run test:unit
npm run test:integration
npm run test:e2e
npm run db:seed
npm run db:generate
npx prisma migrate dev --name <name>
npx prisma generate
npx playwright install chromium
docker compose up -d postgres
docker compose ps
docker compose down -v
```
