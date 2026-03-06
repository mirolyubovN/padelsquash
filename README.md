# Padel & Squash KZ

Kazakhstan-focused padel/squash center platform. Full-stack web app with public booking, customer accounts, a role-separated admin panel, and a trainer self-service portal.

- **Language:** Russian UI, `KZT` currency, `Asia/Almaty` timezone
- **Location:** Almaty, Kazakhstan

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) + React 19 + TypeScript |
| Database | PostgreSQL 16 (Docker) via Prisma ORM 6 |
| Auth | Auth.js / NextAuth 5 (Credentials) |
| Validation | Zod |
| CSS | Tailwind CSS v4 — `@apply` only, BEM class names in JSX |
| Testing | Vitest (unit + integration) + Playwright (e2e) |
| Fonts | Oswald (display/headings, Cyrillic) + Manrope (body) |

---

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Create local env

```powershell
Copy-Item .env.example .env
```

Update `DATABASE_URL` to point at the Docker container (see below).

### 3. Start PostgreSQL (Docker)

```bash
docker compose up -d postgres
docker compose ps   # wait for "healthy"
```

Container: `padelsquash-postgres` · Port: `55432` (host) → `5432` (container)

### 4. Apply migrations + generate client

```bash
npx prisma migrate deploy
npx prisma generate
```

> **Windows note:** `prisma generate` fails with `EPERM` if `next dev` is running and locking the Prisma engine DLL. Stop the dev server first, generate, then restart.

### 5. Seed dev data

```bash
npm run db:seed
```

### 6. Start the app

```bash
npm run dev
```

App runs at `http://localhost:3000`.

---

## Environment Variables

See `.env.example` for the full list.

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | — | Postgres connection string |
| `NEXTAUTH_SECRET` | — | Auth.js session signing key |
| `NEXTAUTH_URL` | `http://localhost:3000` | Auth redirect base URL |
| `APP_TIMEZONE` | `Asia/Almaty` | Venue timezone |
| `PAYMENTS_ENABLED` | `false` | `false` = all bookings auto-confirm; `true` = placeholder payment flow |
| `CUSTOMER_FREE_CANCELLATION_HOURS` | `6` | Free cancellation cutoff in hours |
| `ALLOW_DEMO_FALLBACK` | `false` | Fall back to demo data if DB is unavailable |
| `SEED_ADMIN_EMAIL` | `admin@example.com` | Seeded super-admin email |
| `SEED_ADMIN_PASSWORD` | `Admin123!` | Seeded super-admin password |
| `PAYMENTS_PLACEHOLDER_ADMIN_TOKEN` | — | Token for placeholder payment mark-paid endpoint |

---

## User Roles

| Role | Access |
|---|---|
| `customer` | Self-register, book courts/training, manage own bookings |
| `trainer` | Self-service timetable at `/trainer/schedule` (own schedule + exceptions only) |
| `admin` | Full admin panel except pricing/sports editing and revenue fields |
| `super_admin` | Unrestricted: pricing, sports, revenue, all admin functions |

---

## Test Credentials (after `npm run db:seed`)

| Role | Email | Password | Login URL |
|---|---|---|---|
| `super_admin` | `admin@example.com` | `Admin123!` | `/login?next=%2Fadmin` |
| `admin` | `admin+ops@example.com` | `Admin123!` | `/login?next=%2Fadmin` |
| `trainer` | `trainer@example.com` | `Trainer123!` | `/login?next=%2Ftrainer%2Fschedule` |
| `customer` | `customer@example.com` | `Customer123!` | `/login?next=%2Faccount` |

---

## Features

### Public

| Route | Description |
|---|---|
| `/` | Homepage: hero, pricing overview, FAQ, social links |
| `/book` | Interactive booking form (see below) |
| `/coaches` | Trainer listing with photo, bio, sport tags, per-sport pricing |
| `/prices` | Pricing page |
| `/courts` | Courts listing |
| `/contact` | Contact information |
| `/legal/terms` | Terms of service |
| `/legal/privacy` | Privacy policy |

### Booking Form (`/book`)

Progressive multi-step form with URL state persistence:

1. **Sport** — tab selector (dynamic from DB)
2. **Service type** — `Аренда корта` (court rental) or `Тренировка с тренером` (training)
3. **Date** — date picker; auto-advances up to 14 days to find the nearest available date
4. **Time slots** — multi-select; shows price per slot; slots filtered by sport + service + date
5. **Court picker** *(court rental only)* — appears after slot selection; shows courts available across **all** selected slots (intersection); supports multi-court selection
6. **Trainer selector** *(training only)* — shows trainers available for the sport with per-sport price
7. **Confirm** — price breakdown (courtPrice × numCourts × numSlots), login/register gate for guests

**Multi-court booking:** selecting N courts × M slots creates N×M individual bookings in one submit.

### Customer Account

| Route | Description |
|---|---|
| `/account` | Profile summary |
| `/account/bookings` | Booking history + free cancellation action |
| `/register` | New account registration |
| `/login` | Login |
| `/forgot-password` | Password reset |

### Trainer Portal

| Route | Description |
|---|---|
| `/trainer` | Trainer dashboard |
| `/trainer/schedule` | Own availability slots + schedule exceptions (scoped to logged-in trainer only) |

### Admin Panel

| Route | Description |
|---|---|
| `/admin` | Dashboard: stats, recent bookings |
| `/admin/bookings` | All bookings: filter, search, pagination, status updates (confirm/cancel/complete/no-show) |
| `/admin/bookings/create` | Manual booking creation |
| `/admin/calendar` | Calendar view of bookings |
| `/admin/courts` | Court CRUD: name, sport, active toggle, delete (history-protected) |
| `/admin/courts/[id]/exceptions` | Per-court schedule exceptions |
| `/admin/instructors` | Trainer CRUD: name, per-sport prices, bio, photo URL, sport assignments |
| `/admin/instructors/[id]/schedule` | Trainer weekly schedule intervals (sport-scoped) + exceptions |
| `/admin/services` | Service type CRUD (court rental / training per sport) |
| `/admin/sports` | Sport CRUD: slug, name, icon, sort order |
| `/admin/opening-hours` | Venue opening hours by day of week |
| `/admin/pricing/base` | Component pricing matrix (court/instructor price by sport × period) |
| `/admin/pricing/rules` | Advanced pricing rules |
| `/admin/exceptions` | Global schedule exceptions (venue / court / instructor) |

---

## Booking Rules

- **Session length:** fixed 60 minutes
- **Start times:** whole-hour only (`09:00`, `10:00`, …)
- **Authentication:** required for all booking types
- **Court rental pricing:** `courtPrice[sport][period] × numCourts`
- **Training pricing:** `courtPrice[sport][period] + trainerPrice[sport]`
- **Periods:** `morning`, `day`, `evening_weekend` (resolved from booking time)
- **Cancellation:** free up to `CUSTOMER_FREE_CANCELLATION_HOURS` hours before start (default 6h)
- **Concurrency:** `SERIALIZABLE` isolation + PostgreSQL advisory locks prevent double-booking

---

## Database Schema (key models)

| Model | Key Fields |
|---|---|
| `User` | id, name, email, phone, passwordHash, role, instructorId? |
| `Location` | id, slug, name, address, timezone, active |
| `Sport` | id, slug, name, icon?, active, sortOrder |
| `Court` | id, name, sportId, locationId, active |
| `Instructor` | id, name, bio?, **photoUrl?**, active |
| `InstructorSport` | instructorId + sportId → **pricePerHour** (unique per pair) |
| `InstructorLocation` | instructorId + locationId → active |
| `Service` | id, code, name, sportId, locationId?, requiresCourt, requiresInstructor |
| `ResourceSchedule` | resourceType, resourceId, dayOfWeek, startTime, endTime, **sportId?** |
| `ScheduleException` | resourceType, resourceId?, date, startTime, endTime, type |
| `OpeningHour` | locationId + dayOfWeek → openTime/closeTime (unique) |
| `ComponentPrice` | locationId + sportId + componentType + period + currency → amount (unique) |
| `Booking` | customerId, serviceId, locationId, startAt, endAt, status, priceTotal |
| `BookingResource` | bookingId, resourceType (court/instructor), resourceId |
| `Payment` | bookingId, provider, status, amount |

### Sport-scoped trainer schedules

`ResourceSchedule.sportId` is optional:
- `null` — interval applies to all sports the trainer teaches
- set — interval applies to that sport only

The availability engine filters: `WHERE sportId = service.sportId OR sportId IS NULL`

This lets a trainer be available Mon–Wed for padel and Thu–Sat for squash independently.

---

## Project Structure

```
app/                        Next.js App Router pages + API routes
  (root pages)/             /, /book, /coaches, /prices, /courts, /contact
  account/                  /account, /account/bookings
  admin/                    full admin panel
  trainer/                  trainer self-service portal
  api/availability/         GET  /api/availability
  api/bookings/             POST /api/bookings
  api/payments/             POST /api/payments/placeholder/mark-paid

src/
  components/
    booking/                live-booking-form.tsx (client component)
    admin/                  AdminPageShell, AdminNav, etc.
    site-header.tsx
    site-footer.tsx
  lib/
    admin/resources.ts      all admin CRUD + validation
    availability/
      db.ts                 fetches DB context for availability engine
      engine.ts             slot generation + overlap checks
    bookings/
      persistence.ts        booking creation (overlap check + pricing + payment)
      concurrency.ts        advisory lock helpers
      policy.ts             cancellation cutoff
    account/bookings.ts     customer booking history + cancellation
    auth/
      guards.ts             assertAdmin / assertSuperAdmin helpers
      roles.ts              canManagePricing / canViewRevenue helpers
    content/site-data.ts    all public-site copy (single source of truth)
    domain/types.ts         shared domain type interfaces
    locations/service.ts    location resolution
    pricing/engine.ts       period resolution + price calculation
    settings/service.ts     opening hours + pricing settings
    time/venue-timezone.ts  timezone-aware date helpers

prisma/
  schema.prisma             DB schema
  migrations/               all committed SQL migrations
  seed.ts                   dev/test seed data

docs/
  devops-postgres.md        Docker + Postgres local runbook
  test-credentials.md       seeded test accounts
  next-session-prompt.md    context handoff for new sessions
  production-readiness-checklist.md

tests/
  unit/                     Vitest unit tests
  integration/              Vitest integration tests (real DB)
  e2e/                      Playwright e2e tests

types/                      local type augmentations (next-auth.d.ts)
docker-compose.yml          local Postgres container
auth.ts                     Auth.js / NextAuth config
```

---

## Automated Tests

```bash
npm run test:unit          # Vitest unit tests
npm run test:integration   # Vitest + real DB (reseeds first)
npm run test:e2e           # Playwright (reseeds first)
```

Run lint and e2e **separately** (they race on `test-results/`):

```bash
npm run lint
npm run test:e2e
```

One-time Playwright browser install:

```bash
npx playwright install chromium
```

**Important:** Keep `NEXTAUTH_URL` and Playwright `baseURL` both on `localhost` (not `127.0.0.1`) to avoid session cookie failures in e2e tests.

### Test coverage

- **Unit:** availability engine, pricing engine, booking validation, cancellation policy
- **Integration:** availability API (DB-backed), booking persistence + overlap prevention, concurrent booking conflict
- **E2E:** customer registration → court booking → slot disappears → cancellation; training booking with trainer pricing; admin booking status updates; admin resource CRUD flows

---

## Database Operations

```bash
# Apply all pending migrations
npx prisma migrate deploy

# Create a new migration from schema changes
npx prisma migrate dev --name <descriptive_name>

# Regenerate Prisma client (stop dev server first on Windows)
npx prisma generate

# Seed dev data
npm run db:seed

# Open Prisma Studio
npx prisma studio

# Full reset (destroys all data)
docker compose down -v
docker compose up -d postgres
npx prisma migrate deploy
npm run db:seed
```

### Migrations applied

| Migration | Description |
|---|---|
| `20260305081139_sport_table_transitional` | Sport enum → Sport table (transitional) |
| `20260305083000_sport_table_finalize` | Finalize Sport table, drop enum |
| `20260305103000_location_multi_center` | Add Location model, scope all resources |
| `20260305130000_role_super_admin_trainer` | Expand UserRole enum, add trainer link |
| `20260305140000_instructor_photo_schedule_sport` | Add photoUrl to Instructor, sportId to ResourceSchedule |

---

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
npx prisma migrate deploy
npx prisma migrate dev --name <name>
npx prisma generate
npx playwright install chromium
docker compose up -d postgres
docker compose ps
docker compose stop postgres
docker compose down -v
```

---

## Known Gaps / Not Yet Production-Ready

- Real payment provider (Kaspi / Freedom) — stubs exist, no live integration
- Real refund API — DB status only, no provider call
- File upload for trainer photos — currently URL-only field
- CI pipeline (lint / build / test on push)
- Monitoring, error tracking, alerting
- Backup / restore procedures
- Deployment infrastructure docs (beyond local Docker runbook)
- Multi-location admin UI (schema supports it; admin UX defaults to single location)
