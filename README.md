# Padel & Squash KZ

Kazakhstan-focused padel/squash club platform. Full-stack web app with public booking, customer wallet balances, account self-service, a role-separated admin panel, and a trainer portal.

- Language: Russian UI
- Currency: `KZT`
- Venue timezone: `Asia/Almaty`
- Primary location: Almaty, Kazakhstan

---

## Tech Stack

| Layer | Technology |
| --- | --- |
| Framework | Next.js 16 (App Router) + React 19 + TypeScript |
| Database | PostgreSQL 16 (Docker) via Prisma ORM 6 |
| Auth | Auth.js / NextAuth 5 (Credentials) |
| Validation | Zod |
| Styling | Tailwind CSS v4 with BEM-style JSX classes |
| Testing | Vitest (unit + integration) + Playwright (e2e) |
| Fonts | Oswald (display/headings) + Manrope (body) |

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

### 3. Start PostgreSQL

```bash
docker compose up -d postgres
docker compose ps
```

Wait until the container is healthy.

- Container: `padelsquash-postgres`
- Host port: `55432`
- Container port: `5432`

### 4. Apply migrations and generate Prisma client

```bash
npx prisma migrate deploy
npx prisma generate
```

Windows note: stop `next dev` before `prisma generate` if Prisma DLL files are locked.

### 5. Seed local data

```bash
npm run db:seed
```

### 6. Run the app

```bash
npm run dev
```

App URL: `http://localhost:3000`

---

## Environment Variables

See `.env.example` for the full list.

| Variable | Default | Description |
| --- | --- | --- |
| `DATABASE_URL` | - | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | - | Auth.js session signing key |
| `NEXTAUTH_URL` | `http://localhost:3000` | Auth redirect base URL |
| `APP_TIMEZONE` | `Asia/Almaty` | Venue timezone |
| `CUSTOMER_FREE_CANCELLATION_HOURS` | `6` | Free cancellation cutoff in hours |
| `CUSTOMER_MORNING_CANCELLATION_START_HOUR` | `8` | Morning-slot cancellation rule start hour (inclusive, venue time) |
| `CUSTOMER_MORNING_CANCELLATION_END_HOUR` | `12` | Morning-slot cancellation rule end hour (inclusive, venue time) |
| `EMAIL_VERIFICATION_TTL_HOURS` | `24` | Email confirmation link lifetime |
| `PHONE_VERIFICATION_TTL_HOURS` | `24` | Telegram phone-confirmation session lifetime |
| `SMTP_HOST` | - | SMTP server host for email confirmations/notifications |
| `SMTP_PORT` | `587` | SMTP server port |
| `SMTP_SECURE` | `false` | Use SMTPS (`true` usually with port `465`) |
| `SMTP_USER` | - | SMTP auth user |
| `SMTP_PASS` | - | SMTP auth password |
| `SMTP_FROM` | - | Sender address for transactional emails |
| `TELEGRAM_BOT_TOKEN` | - | Telegram bot token for phone confirmation + notifications |
| `TELEGRAM_BOT_USERNAME` | - | Telegram bot username (without `@`) for deep-links |
| `TELEGRAM_WEBHOOK_SECRET` | - | Secret token validated on `/api/telegram/webhook` |
| `ALLOW_DEMO_FALLBACK` | `false` | Fall back to demo data if DB is unavailable |
| `SEED_SUPER_ADMIN_EMAIL` | `admin@example.com` | Seeded super-admin email |
| `SEED_SUPER_ADMIN_PASSWORD` | `Admin123!` | Seeded super-admin password |
| `SEED_ADMIN_EMAIL` | `manager@example.com` | Seeded operational admin email |
| `SEED_ADMIN_PASSWORD` | `Manager123!` | Seeded operational admin password |
| `SEED_TRAINER_EMAIL` | `trainer@example.com` | Seeded trainer email |
| `SEED_TRAINER_PASSWORD` | `Trainer123!` | Seeded trainer password |
| `SEED_CUSTOMER_EMAIL` | `customer@example.com` | Seeded customer email |
| `SEED_CUSTOMER_PASSWORD` | `Customer123!` | Seeded customer password |

Legacy note: placeholder payment env vars still exist in the repo for old stubs, but the active booking flow is wallet-first.

---

## Verification Setup (Local)

For full registration verification flow locally, configure both email and Telegram:

1. SMTP:
- Set `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`.
- If SMTP is missing, registration still works, but confirmation emails are not delivered automatically.

2. Telegram bot:
- Set `TELEGRAM_BOT_TOKEN` and `TELEGRAM_BOT_USERNAME`.
- Optional but recommended: set `TELEGRAM_WEBHOOK_SECRET`.
- Expose your local app URL publicly (for example via tunnel) and set webhook:

```bash
curl -X POST "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d "{\"url\":\"https://<public-host>/api/telegram/webhook\",\"secret_token\":\"<TELEGRAM_WEBHOOK_SECRET>\"}"
```

Without webhook, phone confirmation via Telegram will not complete.

---

## User Roles

| Role | Access |
| --- | --- |
| `customer` | Register/login, top up balance, book courts/training, manage own bookings |
| `trainer` | Manage own schedule and availability at `/trainer/schedule` |
| `admin` | Operational admin panel, customer creation, manual balance adjustments, manual bookings |
| `super_admin` | Full admin access, including sports/pricing/wallet bonus configuration |

---

## Test Credentials

See [docs/test-credentials.md](docs/test-credentials.md).

Default seeded accounts:

| Role | Login URL | Email | Password |
| --- | --- | --- | --- |
| `super_admin` | `/login?next=%2Fadmin` | `admin@example.com` | `Admin123!` |
| `admin` | `/login?next=%2Fadmin` | `manager@example.com` | `Manager123!` |
| `trainer` | `/login?next=%2Ftrainer%2Fschedule` | `trainer@example.com` | `Trainer123!` |
| `customer` | `/login?next=%2Faccount` | `customer@example.com` | `Customer123!` |

---

## Core Product Flows

### Booking

`/book` is a multi-step booking flow with URL-state persistence.

1. Select sport.
2. Select service type: court rental or training.
3. Select date.
4. Select one or more time slots.
5. Select courts for rental bookings or trainer for training bookings.
6. Review the price breakdown.
7. Confirm booking using wallet balance.

Important behavior:

- Guest users who hit auth mid-flow return with their selection restored.
- If wallet balance is insufficient, the app creates a short-lived booking hold, sends the user to top up, and returns them to the same booking state.
- Multi-slot top-up/resume preserves the full selected series, not just one slot.
- Availability excludes the current customer's active hold when resuming, which protects against the top-up race condition.

### Wallet and Balance

Customer self-service bookings (`/book`) are paid from internal wallet balance.

- Customers can top up from `/account`.
- Admins can manually credit/debit balance from `/admin/wallet` for in-club/cash adjustments.
- Admin-created manual bookings can be completed as wallet or cash/manual (based on selected payment mode).
- Super-admins can configure the wallet top-up bonus threshold and percent.
- Default bonus rule: `10%` bonus for top-ups from `50000 KZT`.
- Wallet-paid customer cancellations refund back to wallet when cancellation is still allowed.
- `no_show` means no refund.

### Registration Verification

- Customer registration requires **two confirmations** before login:
  - email confirmation via one-time link
  - phone confirmation via Telegram bot contact sharing
- Registration flow now redirects to `/register/verify`.
- Email verification endpoint: `/verify/email`.
- Telegram webhook endpoint: `/api/telegram/webhook`.
- Login for customer role is blocked until both confirmations are completed.

### Admin-Created Customers

Admins can create customer accounts from `/admin/wallet` using first name, last name, phone, and email.

- The wallet page exposes an activation/setup link.
- The customer finishes account setup at `/activate-account`.
- After password setup, the activation link becomes invalid automatically.
- "Управлять клиентом" opens a popup modal in `/admin/wallet` (instead of a long inline section).
- "Пополнить баланс" and "Ссылка доступа" from customer rows in `/admin/wallet` also open popup modals (no scroll-jump anchors).
- Admins and super-admins can edit customer email/phone directly from that modal.
- Admins and super-admins can force-reset a customer password from `/admin/wallet`; this invalidates the old password and issues a new activation link.
- Each customer row in `/admin/wallet` includes a direct link to `/admin/clients/[customerId]`.
- Clicking a customer name/email in `/admin/bookings` also opens `/admin/clients/[customerId]`.
- `/admin/clients/[customerId]` shows customer balance, full booking history, and recent wallet operations.

### Admin Booking Operations

- `/admin/calendar` blocks past-time booking creation.
- Clicking a future free slot deep-links into `/admin/bookings/create` with prefilled date, time, and court.
- `/admin/bookings` supports exact customer filtering via `customerEmail` query param (used by wallet deep-links).
- Admin booking create mirrors the customer flow: sport -> service -> trainer (if needed) -> date/time -> court matrix.
- Admin booking create now uses the same timetable UX pattern as `/book`, including visible per-slot prices and total breakdown before submit.
- Admins can select multiple time+court cells in one submit (multi-slot and multi-court batch booking).
- Admin can find and attach existing customers directly in create-booking by `name or phone` (with one-click autofill of profile and balance).
- Admin booking payment mode supports:
  - `auto` (default): wallet if enough balance, otherwise cash/manual
  - `wallet`: wallet-only (insufficient balance returns hold/top-up flow)
  - `cash`: manual cash payment without wallet debit
- Client balance is shown inline on admin booking create and updates by customer email lookup.
- New booking/cancellation notifications are dispatched to admins.
- Training session create/cancel notifications are dispatched to the assigned trainer.

---

## Key Routes

### Public

| Route | Description |
| --- | --- |
| `/` | Homepage |
| `/book` | Booking flow |
| `/prices` | Public pricing |
| `/coaches` | Trainer listing |
| `/courts` | Courts listing |
| `/contact` | Contact page |
| `/register` | Customer registration |
| `/register/verify` | Registration verification status + resend actions |
| `/login` | Login |
| `/activate-account` | Password setup for admin-created customers |
| `/verify/email` | Email confirmation landing page |

### Customer Account

| Route | Description |
| --- | --- |
| `/account` | Profile, wallet balance, top-up, recent wallet activity |
| `/account/bookings` | Booking history and cancellations |

### Trainer

| Route | Description |
| --- | --- |
| `/trainer` | Trainer dashboard |
| `/trainer/schedule` | Own availability and exceptions |

### Admin

| Route | Description |
| --- | --- |
| `/admin` | Dashboard |
| `/admin/bookings` | Booking list and status updates |
| `/admin/clients/[customerId]` | Customer profile with balance, bookings, and wallet history |
| `/admin/bookings/create` | Manual booking creation |
| `/admin/calendar` | Day calendar of court bookings |
| `/admin/wallet` | Customer search/create, balance adjustments, bonus settings |
| `/admin/sports` | Centralized sport setup |
| `/admin/courts` | Court management |
| `/admin/instructors` | Trainer management |
| `/admin/opening-hours` | Opening hours |
| `/admin/exceptions` | Schedule exceptions |

### Integrations / Webhooks

| Route | Description |
| --- | --- |
| `/api/telegram/webhook` | Telegram bot webhook (phone confirmation flow) |

---

## Booking Rules

- Session length: fixed 60 minutes
- Start times: whole-hour only
- Authentication: required to confirm bookings
- Customer self-service booking payment: wallet balance only (`/book`); admin manual bookings can be wallet or cash/manual.
- Cancellation:
  - Morning slots (`08:00-12:00`) can be cancelled only until `00:00` of the previous day.
  - Other slots follow `CUSTOMER_FREE_CANCELLATION_HOURS` before start.
- Concurrency: transactional booking persistence plus hold-based resume flow prevent double-booking

---

## Database Highlights

Key models:

| Model | Purpose |
| --- | --- |
| `User` | Auth identity, role, wallet balance |
| `WalletTransaction` | Immutable wallet ledger |
| `WalletBonusConfig` | Configurable top-up bonus rule |
| `BookingHold` | Short-lived slot holds during top-up/resume |
| `Sport` | Dynamic sports catalog |
| `Court` | Courts by sport/location |
| `Instructor` / `InstructorSport` | Trainers and sport-specific rates |
| `Service` | Rental/training service definitions |
| `ComponentPrice` | Base court/instructor pricing matrix |
| `Booking` / `BookingResource` | Confirmed bookings and linked resources |
| `Payment` | Booking payment records (`wallet` provider for active flow) |

---

## Project Structure

```text
app/
  account/                  Customer account and wallet pages
  admin/                    Admin panel
  trainer/                  Trainer portal
  activate-account/         Admin-created customer activation flow
  api/availability/         Availability API
  api/bookings/             Booking create API
  api/bookings/holds/       Hold creation API for top-up resume

src/
  components/
    admin/                  Admin UI
    booking/                Booking form UI
  lib/
    account/                Customer booking/account logic
    admin/                  Admin CRUD and validation services
    auth/                   Auth helpers and activation-link logic
    availability/           Availability DB + engine
    bookings/               Booking persistence, holds, URL state
    content/                Public site copy
    settings/               Opening hours and pricing settings
    wallet/                 Wallet queries and balance services

prisma/
  schema.prisma             Database schema
  migrations/               Committed migrations
  seed.ts                   Local/dev seed data

docs/
  devops-postgres.md        Local Postgres runbook
  test-credentials.md       Seeded test accounts
```

---

## Commands

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
```

Important: keep `NEXTAUTH_URL` and Playwright `baseURL` on `localhost`, not `127.0.0.1`, to avoid auth cookie issues in e2e tests.

---

## Known Gaps

- Real payment provider integration (Kaspi/Freedom) is still stubbed; current production logic is internal wallet-based.
- Some deep admin validation strings in `src/lib/admin/resources.ts` still need a full encoding cleanup pass.
- File upload for trainer photos is still URL-based only.
- CI and deployment documentation are still minimal.
- Monitoring, alerts, backups, and production ops procedures are not complete.
