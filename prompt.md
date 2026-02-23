You are a senior full-stack engineer. Build a production-ready web app for a squash & padel center: a public website + a booking system + an admin panel. Do NOT use any external CMS (no Strapi, WordPress, etc.). Admins must manage timetables and pricing through the built-in admin UI (simple tables/forms).

Key requirements
Language (clients are Russian-speaking)

All UI text, labels, buttons, error messages, emails/notifications, and page content must be in Russian.

Do not implement multilingual/i18n. Russian only.

Styling (Tailwind + BEM only, no inline utilities)

Tailwind CSS must be used ONLY via @apply inside CSS files, and referenced in React components via BEM class names.

No inline Tailwind utility classes in JSX (no className="flex gap-4 ...")

Use one of these approaches consistently (choose one and stick to it):

Global stylesheet(s) with BEM blocks (recommended for speed), or

CSS Modules per component with BEM class names.

Example allowed:

JSX: className="booking-form__step booking-form__step--active"

CSS: .booking-form__step { @apply flex items-center gap-2; }

Keep CSS clean and minimal, but real.

Timezone

Timezone: Europe/Vilnius (handle DST correctly).

Store timestamps in UTC in DB; convert to Europe/Vilnius on UI and when interpreting user-selected dates.

Tech stack (must follow)

Next.js 16+ (App Router, TypeScript)

PostgreSQL + Prisma ORM

Tailwind CSS (but applied via @apply in CSS with BEM naming only)

Auth: NextAuth (Auth.js) Credentials (email+password)

Validation: Zod

Roles & permissions

Roles: customer, coach, admin.

Enforce RBAC server-side for all admin routes and all mutations.

/admin/** is admin-only.

Public website (Russian UI)

Pages with clean UI:

Home (Главная)

Courts (Корты)

Coaches (Тренеры)

Prices (Цены)

Contact (Контакты)
Include a clear CTA “Забронировать”.

Booking system (end-to-end, MVP but real)

Booking types:

Court Rental (reserve a court only)

Coaching Session (reserve court + instructor)

Rules:

Slot granularity = 15 minutes.

Durations configurable per Service, seed defaults:

Padel: 60 / 90 / 120 minutes

Squash: 45 / 60 minutes

Optional buffer time between bookings (bufferMin) per Service.

Booking statuses must include:

pending_payment, confirmed, cancelled, completed, no_show
(You may omit other statuses to keep MVP tight.)

Customer cancellation policy:

Allow cancellation only up to 24 hours before start time (enforced server-side).

Prevent double booking using a robust DB concurrency strategy:

Use a transaction + either SERIALIZABLE isolation OR Postgres advisory locks

Must demonstrate in code how conflicts are prevented

Availability algorithm:

Generate candidate slots in 15-min steps for requested date + duration.

A slot is available if:

It is within venue opening hours,

Within instructor schedules (when instructor required),

Not blocked by exceptions (maintenance/closed),

No overlap with existing bookings in statuses pending_payment or confirmed.

For Coaching booking, both a court and an instructor must be simultaneously available.

Timetable management (NO CMS, admin UI inside app)

Implement a 3-layer schedule model:

Venue opening hours (weekly template)

OpeningHour(dayOfWeek, openTime, closeTime, active)

Instructor working hours (weekly template)

ResourceSchedule(resourceType='instructor', resourceId=instructorId, dayOfWeek, startTime, endTime, active)
(For MVP, courts follow venue opening hours unless blocked by exceptions.)

Exceptions (one-off blocks)

ScheduleException(resourceType 'venue'|'court'|'instructor', resourceId nullable for venue, date, startTime, endTime, type 'closed'|'maintenance', note)

Admin UI (keep minimal: tables/forms, no drag-and-drop calendar):

/admin/opening-hours: edit weekly venue opening hours

/admin/instructors: list + /admin/instructors/[id]/schedule: edit weekly intervals + list/add exceptions

/admin/courts: list + /admin/courts/[id]/exceptions: list/add exceptions

Optional /admin/exceptions: unified exceptions list with filters

Pricing (NO CMS, rule-based pricing)

Goal: admins set different prices by day/time/service/sport via minimal UI.

Data model:

BasePrice: base hourly price per service (and/or sport)

PriceRule:

name, priority (int), active, startDate, endDate (optional)

conditionsJson supports:

daysOfWeek?: number[] (0-6)

timeRange?: { start: 'HH:MM', end: 'HH:MM' }

sport?: 'padel'|'squash'

serviceId?: string

dateRange?: { start: 'YYYY-MM-DD', end: 'YYYY-MM-DD' } (optional)

actionJson:

{ type: 'override', value: number } (sets hourly price)

{ type: 'delta', value: number } (adds/subtracts hourly amount)

Rule evaluation algorithm (implement and document clearly in code):

Find all matching rules for the booking.

Apply the highest-priority matching override if present.

Apply all matching delta rules in descending priority order.

Compute total: hourlyRate * (durationMin / 60).

Store pricing snapshot on Booking: priceTotal + pricingBreakdownJson.

Admin UI:

/admin/pricing/base: table to edit base prices per service

/admin/pricing/rules: list rules + create/edit form with:

name, priority, active

weekday checkboxes

time range inputs

sport dropdown

service dropdown

action type + value

Public “Prices” page:

Show base prices and a simple readable table/explanation of peak/off-peak derived from rules (no complex NLP required).

Payments (placeholder, provider to be decided: Kaspi / Freedom Pay)

We cannot use Stripe. Payment provider will be Kaspi or Freedom Pay later. Implement a provider-agnostic placeholder now so MVP is not blocked.

Feature flag:

PAYMENTS_ENABLED (default false)

Behavior:

If PAYMENTS_ENABLED=false:

Booking is created and immediately set to confirmed.

No payment steps shown in UI.

If PAYMENTS_ENABLED=true:

Booking is created with status pending_payment.

Create a Payment row with provider placeholder and status unpaid.

UI shows a Russian instruction page:

“Оплата временно недоступна. Администратор свяжется с вами для подтверждения.”

Provide an admin action to confirm payment manually:

In admin booking detail, a button “Подтвердить оплату” marks payment paid and booking confirmed.

Optionally add a protected endpoint for manual marking paid:

POST /api/payments/placeholder/mark-paid (admin-only OR protected by env secret token)

Architecture for future integration:

Create a clean abstraction:

src/lib/payments/provider.ts defines an interface

Implement PlaceholderProvider now

Add stub files KaspiProvider and FreedomProvider with TODO comments only (no real API calls)

Prisma data model (minimum required)

Implement at least these models, including indexes:

User(id, name, email, phone, passwordHash, role, createdAt, updatedAt)

Court(id, name, sport, active, notes, createdAt, updatedAt)

Instructor(id, name, bio, active, createdAt, updatedAt)

Service(id, name, sport, requiresCourt, requiresInstructor, durationDefaultMin, bufferMin, allowedDurationsJson, active, createdAt, updatedAt)

OpeningHour(id, dayOfWeek, openTime, closeTime, active)

ResourceSchedule(id, resourceType, resourceId, dayOfWeek, startTime, endTime, active)

ScheduleException(id, resourceType, resourceId nullable for venue, date, startTime, endTime, type, note)

Booking(id, customerId, serviceId, startAt, endAt, status, currency, priceTotal, pricingBreakdownJson, createdAt, updatedAt)

BookingResource(id, bookingId, resourceType 'court'|'instructor', resourceId)

BasePrice(id, serviceId, currency, hourlyRate, active, createdAt, updatedAt)

PriceRule(id, name, priority, active, startDate, endDate, conditionsJson, actionJson, createdAt, updatedAt)

Payment(id, bookingId, provider 'placeholder'|'kaspi'|'freedom'|'manual', status 'unpaid'|'paid'|'failed'|'refunded', amount, currency, providerPaymentId?, createdAt, updatedAt)

Indexes & constraints (important):

Fast overlap checks:

Index bookings on startAt, endAt, status

Index booking_resources on (resourceType, resourceId) and (bookingId)

Ensure availability overlap checks consider bookings with statuses: pending_payment, confirmed.

Use a transaction strategy that reliably prevents double booking (document your choice).

API routes / server actions

All mutations must be server-side with Zod validation.
Implement:

GET /api/availability?serviceId=&date=YYYY-MM-DD&durationMin=

POST /api/bookings (create booking; if payments enabled -> pending_payment else confirmed)

POST /api/payments/placeholder/mark-paid (protected; marks paid + confirms booking)

Customer account (Russian UI)

Profile page

Booking history

Cancel booking (only if policy allows)

Admin panel (Russian UI)

CRUD and management pages:

Courts, Instructors, Services

Opening hours

Instructor schedules

Exceptions (venue/court/instructor)

Base prices + pricing rules

Bookings list with actions:

cancel

mark completed

mark no_show

confirm payment (when booking is pending_payment)

Seed data

Create a Prisma seed script:

1 admin user: admin@example.com / Admin123! (override via env)

Sample courts: 3 padel + 2 squash

2 instructors

Services + base prices + 2–3 price rules (weekday prime time + weekend)

Venue opening hours defaults

Deliverables

Output a complete repo structure with:

Prisma schema + migration instructions

.env.example

README with setup steps (db, auth, payments flag)

Progress documents with detailed summary of what has been done each session and thats next

Well-structured modules for availability and pricing engine (commented)

Demonstrate double-booking prevention strategy in code

Styling implemented via BEM CSS classes + Tailwind @apply only (no inline Tailwind utilities)

Constraints

No external CMS.

No “TODO implement booking”—must be end-to-end.

Russian-only UI everywhere.

Prioritize correctness (availability, pricing, concurrency, timezone) over extra features.

Proceed to generate the codebase.