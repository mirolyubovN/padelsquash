# Full Redesign & Booking System Plan

> Complete plan for: (1) QA fixes, (2) design overhaul inspired by padel74.ru, (3) production-grade booking system, (4) admin panel rebuild, (5) multi-location support, (6) dynamic sport types.

---

## Part A: QA Fixes (From Current Audit)

Quick cleanup pass before any redesign work.

### A.1 Developer/placeholder text visible to public users

- [x] `app/forgot-password/page.tsx`: Remove "Для MVP" from hint text
- [x] `app/page.tsx`: Remove "Фото и описание будут добавлены позже" fallback — use empty or hide
- [x] `app/coaches/page.tsx`: Remove "Описание тренера будет добавлено позже" — hide bio if empty
- [x] `app/legal/terms/page.tsx`: Remove "Временная страница" from description
- [x] `app/legal/privacy/page.tsx`: Remove "после юридического согласования" from description
- [x] `app/admin/opening-hours/page.tsx`: Remove "в БД через Server Action" from description
- [x] `app/admin/services/page.tsx`: Remove "Упрощенная модель услуг" — rewrite description
- [x] `app/admin/courts/page.tsx`: Remove "в БД" from description
- [x] `src/components/admin/admin-shell-frame.tsx`: Change English "admin" badge to "Админ"
- [x] `app/book/page.tsx`: Remove "(demo)" from fallback instructor names

### A.2 Functional bugs

- [x] `app/account/bookings/page.tsx`: Replace raw `serviceCode` display with human-readable service name
- [x] `app/coaches/page.tsx`: Booking link should pre-fill sport/service (`/book?sport=padel&service=training`)
- [x] `app/login/page.tsx`: Default redirect should be `/account`, not `/admin`
- [x] `app/page.tsx`: Duplicate section heading (rulesTitle rendered as both h2 and h3)
- [x] `src/lib/content/site-content.ts`: WhatsApp link uses dummy number `77000000000`

### A.3 Orphaned code cleanup

- [x] `app/globals.css`: Remove all `.home-page__*` orphaned CSS blocks (~60 rules)
- [x] `src/lib/content/site-content.ts`: Remove `serviceItems` (unused), `formTitle`/`formDescription` (unused), `coachItems` (unused)
- [x] `src/components/contact/contact-form.tsx`: Delete orphaned component
- [x] `src/components/booking-form-preview.tsx`: Delete if still orphaned

### A.4 Minor fixes

- [x] Admin pricing/rules page not in sidebar nav — add to `admin-nav-config.ts` or remove the page
- [x] Prices page: hide trainer example section when no instructors exist (shows "0 ₸")
- [x] Add `role="status"` to success messages where missing

---

## Part B: Design Overhaul — Inspired by padel74.ru

Reference: padel74.ru uses bold geometric shapes, vibrant blue (#4E6BF2) accent, uppercase headings, dark/light section alternation, full-width hero with CTA, and a premium sports-club feel.

### B.1 New design system

**Color palette:**
- Primary: Vibrant blue (accent for CTAs, highlights, active states)
- Dark: Near-black navy (hero backgrounds, dark sections, contrast)
- White: Clean white (cards, content backgrounds)
- Light gray: #F5F5F5 (alternating section backgrounds)
- Accent warm: Optional warm tone for secondary CTAs

**Typography:**
- Headings: Bold/black weight, uppercase or semi-uppercase, geometric sans-serif feel
- Body: Clean readable sans-serif (keep Manrope or switch to Inter/Golos Text for better Cyrillic)
- Mono: Keep IBM Plex Mono for data/prices

**Layout principles:**
- Full-width sections with alternating dark/light backgrounds
- Bold hero with photo or gradient + large headline + prominent CTA
- Card-based content blocks with generous padding
- Clear visual hierarchy through size, weight, and color contrast
- Mobile-first responsive design

### B.2 Homepage redesign

- [ ] **Hero**: Full-width dark section with background image/gradient, large uppercase title ("ПАДЕЛ И СКВОШ В АЛМАТЫ"), subtitle, prominent "ЗАБРОНИРОВАТЬ" button
- [ ] **About section**: 2–3 feature cards on a light background (courts count, equipment included, online booking)
- [ ] **Courts section**: Photo/placeholder cards for padel and squash with court count and CTA
- [ ] **Pricing section**: Clean table with DB-backed prices, clear tier labels
- [ ] **Coaches section**: Coach cards with avatars, sport tags, price, "Записаться" CTA
- [ ] **FAQ section**: Accordion-style FAQ (not just a list)
- [ ] **Contact/Social section**: Address, phone, social links, map link
- [ ] **Sticky mobile CTA**: "Забронировать" button fixed to bottom on mobile
- [ ] Remove all placeholder "будет добавлено позже" sections

### B.3 Booking page redesign

- [ ] Clean step-by-step wizard with clear visual stepper
- [ ] Large, tappable slot buttons with price and tier displayed
- [ ] Trainer cards with avatar, name, price, sport tags
- [ ] Clear total price summary before submit
- [ ] Auth banner at top for unauthenticated users

### B.4 Auth pages redesign

- [ ] Centered card layout with club branding
- [ ] Clean form fields with proper validation feedback
- [ ] Login: email + password + "Забыли пароль?" + register link
- [ ] Register: name, email, phone, password with inline validation

### B.5 Account pages

- [ ] Tab navigation: Профиль / Мои бронирования
- [ ] Booking cards (not table) on mobile with status badges
- [ ] Upcoming vs past bookings separated
- [ ] Cancel confirmation dialog

### B.6 Global

- [ ] Responsive header with mobile hamburger menu (already exists, polish)
- [ ] Footer with social links, nav, contact info, legal links
- [ ] All pages use the new design system consistently
- [ ] Remove all orphaned CSS from old design

---

## Part C: Booking System — Production-Grade Architecture

### Current limitations being addressed:
1. Only 60-minute sessions, only on the hour
2. No manual/admin booking creation
3. No rescheduling
4. Instructor schedules are "forever" (no date ranges)
5. Exceptions are single-date only (no date ranges)
6. No "block all courts" bulk exception
7. No day/calendar view for admin
8. No revenue reporting
9. No booking notes or audit trail

### C.1 Flexible session durations

**Schema changes:**
- [ ] Add `allowedDurationsMin` (Int array) to `Service` model — e.g. `[60, 90, 120]` for padel, `[45, 60]` for squash
- [ ] Add `slotGranularityMin` to settings or per-service — default 30 minutes (allows 08:00, 08:30, 09:00 starts)
- [ ] Remove the hardcoded 60-minute constraint from `persistence.ts` and `engine.ts`

**Availability engine changes:**
- [ ] Accept `durationMin` as a real parameter (currently ignored, always 60)
- [ ] Generate candidate slots at the configured granularity (e.g. every 30 min)
- [ ] A slot is available if the full duration fits within opening hours, schedule, and has no overlap

**Booking form changes:**
- [ ] After selecting sport + service, show duration picker (e.g. "60 мин / 90 мин / 120 мин")
- [ ] Slot display adjusts based on selected duration
- [ ] Price scales with duration (courtPrice × durationMin/60)

### C.2 Admin manual booking creation

**New page: `/admin/bookings/create`**

- [ ] Sport selection
- [ ] Service type selection (court rental / training)
- [ ] Date picker
- [ ] Duration picker
- [ ] For training: instructor selection
- [ ] Time slot selection (uses the same availability engine, but with admin bypass option to override soft blocks)
- [ ] Customer: search existing by name/email/phone, or create new inline
- [ ] Payment: mark as paid (cash), pending, or free (complimentary)
- [ ] Optional admin note
- [ ] Submit creates booking + payment record, bypassing the public auth requirement

**Backend:**
- [ ] New server action `createBookingAsAdmin` — same persistence logic but:
  - No auth requirement on the customer (admin is authenticated)
  - Can optionally override availability (force-book a blocked slot with a warning)
  - Creates a `BookingNote` with "Создано администратором"

### C.3 Booking rescheduling

**Admin bookings page:**
- [ ] Add "Перенести" (reschedule) action on confirmed/pending bookings
- [ ] Opens a modal/page showing the current booking details + a new date/time picker
- [ ] Uses availability engine to show available slots for the same service/duration
- [ ] On confirm: cancels old booking, creates new booking linked to the original
- [ ] Preserves payment status from original booking

**Schema:**
- [ ] Add optional `rescheduledFromId` field on `Booking` — links to the original booking

### C.4 Instructor schedule — date-range based

**Current problem:** Instructor `ResourceSchedule` rows are recurring weekly patterns with no start/end date. They apply forever.

**New model:**

- [ ] Add `validFrom` (Date) and `validTo` (Date, nullable) to `ResourceSchedule`
  - `validTo = null` means "ongoing until changed"
  - This allows: "Instructor works Mon/Wed/Fri 09:00–17:00 from March 1 to May 31"
- [ ] Admin instructor schedule page:
  - Show a date-range picker for each schedule interval
  - Default new intervals to start from today with no end date
  - Allow setting an end date to expire the interval
  - Visual timeline/calendar showing when each interval is active
- [ ] Availability engine:
  - Filter `ResourceSchedule` rows by `validFrom <= date AND (validTo IS NULL OR validTo >= date)`

### C.5 Exceptions — date ranges and bulk operations

**Current problem:** Each exception is a single date. Blocking 3 days = 3 records. No "all courts" bulk option.

**Schema changes:**
- [ ] Add `dateEnd` (Date, nullable) to `ScheduleException` — if set, the exception applies from `date` to `dateEnd` inclusive
- [ ] Add `recurrence` field (enum: `none`, `weekly`, `monthly`) — for recurring blocks like "every Sunday 08:00–10:00"

**Admin exceptions page:**
- [ ] Date range picker (start date + optional end date)
- [ ] Quick presets: "Сегодня", "Завтра", "Эта неделя", "Следующая неделя"
- [ ] Bulk target: "Все корты" option that creates one venue-level exception (already exists) with clear labeling
- [ ] Affected bookings preview: before creating, show how many confirmed bookings would be affected
- [ ] Type expanded: "closed", "maintenance", "tournament", "private_event", "holiday"

**Quick actions (accessible from dashboard):**
- [ ] "Заблокировать все корты на дату" — one-click venue exception with date/time picker
- [ ] "Тренер болен сегодня" — one-click instructor exception for today, full day

### C.6 Admin calendar/day view

**New page: `/admin/calendar`**

This is the single most important missing feature for day-to-day operations.

- [ ] **Day view**: Shows all courts as columns, time slots as rows (e.g. 08:00–23:00)
- [ ] Each cell shows: booked (with customer name + service type), blocked (exception), or free
- [ ] Color coding: confirmed=green, pending=yellow, blocked=gray, training=blue accent
- [ ] Click a free cell → opens quick-create booking modal
- [ ] Click a booked cell → opens booking details with actions (cancel, complete, reschedule)
- [ ] Date navigation: prev/next day arrows, date picker, "Сегодня" shortcut
- [ ] Filter by sport (show only padel courts or only squash courts)
- [ ] Shows instructor assignments on training bookings

**Data source:**
- [ ] Server component that fetches all bookings for the day + all exceptions + opening hours
- [ ] Renders a time grid with slots at the configured granularity

### C.7 Booking notes and audit trail

**Schema:**
- [ ] New `BookingNote` model: `id, bookingId, authorId, content, createdAt`
- [ ] New `AuditLog` model: `id, userId, action, entityType, entityId, details (Json), createdAt`

**Admin bookings:**
- [ ] Notes section in booking detail: view existing notes, add new note
- [ ] Auto-generated notes for status changes ("Статус изменён: confirmed → cancelled. Администратор: admin@example.com")
- [ ] Audit log for all admin mutations (price changes, schedule changes, booking actions)

### C.8 Revenue and reporting

**New page: `/admin/reports`**

- [ ] **Revenue summary**: Total revenue by day/week/month with a date range picker
- [ ] **Breakdown by**: sport, service type (court vs training), court, instructor
- [ ] **Occupancy rate**: % of available court-hours that were booked, by court and by day
- [ ] **Cancellation rate**: Number and % of cancelled bookings
- [ ] **Top customers**: Most frequent bookers
- [ ] **Export**: CSV download for any report view

### C.9 Refund handling

**Admin bookings:**
- [ ] "Вернуть оплату" (refund) action on paid+cancelled bookings
- [ ] Sets `Payment.status` to `refunded`
- [ ] Creates a `BookingNote` recording the refund
- [ ] For future: integrates with payment provider's refund API

### C.10 Booking status transition rules

**Backend:**
- [ ] Enforce valid status transitions:
  - `pending_payment` → `confirmed` (via payment) or `cancelled`
  - `confirmed` → `completed`, `no_show`, or `cancelled`
  - `completed` → (terminal, no further changes)
  - `no_show` → (terminal)
  - `cancelled` → (terminal)
- [ ] Admin override: can force any transition with a note explaining why

---

## Part D: Admin Panel Rebuild

### D.1 Navigation and layout

- [ ] Sidebar with all sections (already exists, verify completeness)
- [ ] Add `/admin/calendar` to sidebar (prominent position, first item)
- [ ] Add `/admin/bookings/create` to sidebar or as a button on bookings page
- [ ] Add `/admin/reports` to sidebar
- [ ] Breadcrumbs on all nested pages
- [ ] Mobile-responsive sidebar (hamburger on mobile)

### D.2 Dashboard improvements

- [ ] Today's schedule mini-view (simplified version of the calendar page)
- [ ] Revenue: today / this week / this month with comparison to previous period
- [ ] Alerts: pending payments, upcoming bookings without payment, exceptions affecting tomorrow
- [ ] Quick actions: "Создать бронирование", "Заблокировать дату", "Экстренный блок тренера"
- [ ] Recent activity feed (last 10 actions: bookings, cancellations, payments)

### D.3 Bookings page improvements

- [ ] Search by phone number (in addition to name/email)
- [ ] Sort by any column
- [ ] Bulk actions: select multiple → cancel all, mark all completed
- [ ] "Создать бронирование" button in header
- [ ] Export to CSV
- [ ] Status transition validation with confirmation dialogs

### D.4 Courts page improvements

- [ ] Allow changing sport after creation (with confirmation if bookings exist)
- [ ] Allow updating court name (already exists)
- [ ] Display order field for controlling public display order
- [ ] Bulk activate/deactivate
- [ ] Show upcoming bookings count per court

### D.5 Instructors page improvements

- [ ] Allow editing instructor name
- [ ] Per-sport pricing (optional: if instructor has different rates for padel vs squash)
- [ ] Inline schedule summary (e.g. "Пн, Ср, Пт 09:00–17:00")
- [ ] Upcoming bookings count
- [ ] "Заблокировать сегодня" quick action per instructor

### D.6 Opening hours improvements

- [ ] Validate closeTime > openTime server-side
- [ ] Date-range overrides: "Особый график на 1–7 марта" separate from the weekly template
- [ ] Preview: "При сохранении изменится расписание начиная с завтра"
- [ ] Holiday presets (KZ public holidays)

### D.7 Pricing improvements

- [ ] Make pricing tier thresholds configurable (not hardcoded noon/17:00)
- [ ] Per-sport instructor pricing (optional)
- [ ] Price change history / audit trail
- [ ] Preview: "Изменение затронет бронирования начиная с [date]"

---

## Part F: Multi-Location / Multi-Center Support

### Rationale

The system must support multiple physical locations (centers) — e.g., a second branch in another part of the city. When >1 active location exists, location selection becomes the **first step** of the booking flow. When only 1 location exists, the step is skipped automatically.

### F.1 Schema: `Location` model

```prisma
model Location {
  id        String   @id @default(cuid())
  name      String                           // "Алматы — Абая 120"
  slug      String   @unique                 // "almaty-abaya" — used in URLs
  address   String                           // full address string
  phone     String?
  email     String?
  timezone  String   @default("Asia/Almaty")
  mapUrl    String?                          // Google Maps link
  active    Boolean  @default(true)
  sortOrder Int      @default(0)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  courts          Court[]
  instructors     InstructorLocation[]
  openingHours    OpeningHour[]
  componentPrices ComponentPrice[]
}
```

### F.2 Schema: Scope existing models to location

- [ ] **Court** — add `locationId String` + relation to `Location`
- [ ] **OpeningHour** — add `locationId String` + relation; remove `@@unique([dayOfWeek])` → replace with `@@unique([locationId, dayOfWeek])`
- [ ] **ComponentPrice** — add `locationId String` + relation; update unique constraint: `@@unique([locationId, sport, componentType, period, currency])`
- [ ] **ResourceSchedule** — no change needed (already scoped by `resourceId` which belongs to a location-scoped court/instructor)
- [ ] **ScheduleException** — add optional `locationId String?` for venue-level exceptions per location (currently `resourceId` is null for venue-level)
- [ ] **Booking** — add `locationId String` + relation (denormalized for easy filtering/reporting)
- [ ] **Service** — add `locationId String?` (nullable = global service shared across locations; non-null = location-specific service). Default: null (shared).

### F.3 Schema: Instructors ↔ Locations (many-to-many)

Instructors can work at multiple locations. Use a join table:

```prisma
model InstructorLocation {
  id           String     @id @default(cuid())
  instructorId String
  locationId   String
  active       Boolean    @default(true)

  instructor Instructor @relation(fields: [instructorId], references: [id], onDelete: Cascade)
  location   Location   @relation(fields: [locationId], references: [id], onDelete: Cascade)

  @@unique([instructorId, locationId])
}
```

### F.4 Booking flow changes

- [ ] **Step 0 (conditional)**: If >1 active location → show location picker cards (name, address, sport count). If only 1 → auto-select and skip.
- [ ] All subsequent steps (sport, service, trainer, date, time) are filtered by selected `locationId`.
- [ ] URL query param: `/book?location=almaty-abaya&sport=padel&...`
- [ ] Location persisted across auth redirects along with other booking params.

### F.5 Availability engine changes

- [ ] `getAvailableSlots()` receives `locationId` as a required parameter
- [ ] Filters courts by `locationId`
- [ ] Filters opening hours by `locationId`
- [ ] Filters venue-level exceptions by `locationId`
- [ ] Filters instructor availability by `InstructorLocation` join

### F.6 Admin changes

- [ ] **Location selector in admin header**: Admin sees all locations; selecting one scopes all admin pages to that location
- [ ] **New admin page: `/admin/locations`** — CRUD for locations (name, address, slug, phone, timezone, map URL, active/inactive)
- [ ] All admin pages (courts, instructors, bookings, calendar, exceptions, opening hours, pricing) filter by selected location
- [ ] Reports page supports "All locations" aggregate or per-location breakdown
- [ ] Dashboard shows stats per selected location

### F.7 Public site changes

- [ ] **Homepage**: If multiple locations, show location cards section. Each card links to `/book?location=<slug>`.
- [ ] **Contact page**: Show all active locations with address, phone, map for each.
- [ ] **Header**: No location selector on public site — location is chosen during booking or from contact page.
- [ ] `site-content.ts`: Refactor `siteConfig` address/phone/mapUrl to be per-location from DB. Keep site-level name, email, social links.

### F.8 Migration strategy

- [ ] Create `Location` table and seed with one default location (current venue data from `siteConfig`)
- [ ] Add `locationId` columns as nullable first, run data migration to set the default location ID on all existing rows
- [ ] Make `locationId` required (non-nullable) after migration
- [ ] Update all queries to include `locationId` filter
- [ ] Single-location mode: when only 1 active location, the system behaves identically to current (no visible location step)

---

## Part G: Dynamic Sport Types

### Rationale

Currently `Sport` is a Prisma enum (`padel | squash`). This makes adding tennis, table tennis, or any new sport a schema migration + code change. Instead, sport types should be a database table so admins can add/manage sports without deploys.

### G.1 Schema: Replace `Sport` enum with `Sport` model

```prisma
model Sport {
  id        String   @id @default(cuid())
  slug      String   @unique     // "padel", "squash", "tennis", "table-tennis"
  name      String               // "Падел", "Сквош", "Теннис", "Настольный теннис"
  icon      String?              // optional icon identifier or emoji
  active    Boolean  @default(true)
  sortOrder Int      @default(0)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  courts          Court[]
  services        Service[]
  instructors     InstructorSport[]
  componentPrices ComponentPrice[]
}
```

### G.2 Schema: Replace enum references with foreign keys

- [x] **Court** — replace `sport Sport` enum with `sportId String` + relation to `Sport`
- [x] **Service** — replace `sport Sport` enum with `sportId String` + relation to `Sport`
- [x] **ComponentPrice** — replace `sport Sport` enum with `sportId String` + relation; update unique constraint
- [x] **Instructor** — replace `sports Sport[]` array with `InstructorSport` join table (many-to-many)

### G.3 Schema: Instructors ↔ Sports (many-to-many with per-sport pricing)

```prisma
model InstructorSport {
  id           String  @id @default(cuid())
  instructorId String
  sportId      String
  pricePerHour Decimal @db.Decimal(10, 2)   // per-sport pricing!

  instructor Instructor @relation(fields: [instructorId], references: [id], onDelete: Cascade)
  sport      Sport      @relation(fields: [sportId], references: [id], onDelete: Cascade)

  @@unique([instructorId, sportId])
}
```

This replaces the current flat `Instructor.pricePerHour` and `Instructor.sports[]` with a proper join table that supports **per-sport pricing** (e.g., a coach charges 8000 KZT/hr for padel but 6000 KZT/hr for tennis).

### G.4 Remove hardcoded sport references in code

- [x] `src/lib/content/site-content.ts`: Remove hardcoded `courtItems`, `sharedCourtSpecs` with padel/squash keys — courts come from DB
- [x] `src/lib/domain/types.ts`: Remove `Sport` type alias if it references the enum — use the DB model's `slug` or `id`
- [x] Booking form: Sport selection step fetches sports from DB (via API or server component prop) instead of hardcoded list
- [x] Pricing engine: Fetches `ComponentPrice` by `sportId` instead of enum value
- [x] Availability engine: Filters courts by `sportId` instead of enum
- [x] Admin pages: Sport dropdowns populated from DB query
- [x] Homepage court/sport sections: Rendered from DB data, not `site-content.ts` constants
- [x] Coaches page: Sport tags from `InstructorSport` join, not `Instructor.sports[]` enum array

### G.5 Admin: Sport management

- [x] **New admin page: `/admin/sports`** — CRUD for sports (name, slug, icon, active, sort order)
- [x] Default seed: padel, squash. Admin can add tennis, table-tennis, etc.
- [x] Deleting a sport: blocked if courts/services/bookings reference it; offer deactivation instead

### G.6 Migration strategy

- [x] Create `Sport` table and `InstructorSport` table
- [x] Seed `Sport` rows for `padel` and `squash` (matching existing enum values)
- [x] Add `sportId` columns as nullable alongside existing `sport` enum columns
- [x] Data migration: map existing enum values to the new `Sport` row IDs
- [x] Migrate `Instructor.sports[]` + `Instructor.pricePerHour` into `InstructorSport` rows
- [x] Make `sportId` required, drop old `sport` enum columns
- [x] Drop the `Sport` Prisma enum
- [x] Update all queries and components

### G.7 Interaction with multi-location (Part F)

Sports are **global** (not per-location). A sport like "Падел" exists once in the system. What varies per location is:
- Which **courts** exist for that sport at that location
- Which **instructors** work that sport at that location (via `InstructorLocation` + `InstructorSport`)
- What **prices** apply at that location (via `ComponentPrice.locationId + sportId`)

The booking flow becomes: **Location** (if >1) → **Sport** (filtered by courts available at location) → Service → Trainer → Date → Time.

---

## Part E: Additional Features (Lower Priority)

### E.1 Customer notifications
- [ ] Email confirmation after booking
- [ ] Email reminder 24h before session
- [ ] Email notification on cancellation (by admin or by customer)
- [ ] WhatsApp notification option (via WhatsApp Business API)

### E.2 Recurring bookings
- [ ] "Повторять еженедельно" option in booking form
- [ ] Creates linked bookings for N weeks ahead
- [ ] Cancel series or individual occurrence

### E.3 Minimum advance booking time
- [ ] Configurable setting: "Минимум за X часов до начала" (e.g. 2 hours)
- [ ] Prevents last-minute bookings that the venue can't prepare for

### E.4 Maximum advance booking window
- [ ] Configurable: "Бронирование доступно на X дней вперёд" (e.g. 14 days)
- [ ] Prevents bookings too far in the future

### E.5 Waitlist
- [ ] If a desired slot is full, customer can join a waitlist
- [ ] On cancellation, first waitlisted customer is notified

---

## Implementation Priority

Schema-level changes (F + G) should come **before** feature work that depends on them. The migration order matters: Sport model first (G), then Location model (F), since locations reference sports through courts and prices.

| # | Phase | Effort | Impact |
|---|-------|--------|--------|
| 1 | Part A (QA fixes) | Small | High — removes bugs and embarrassment |
| 2 | **G.1–G.6 (Dynamic sport types)** | **Medium** | **Critical — unblocks tennis/table-tennis, eliminates hardcoded enum** |
| 3 | **F.1–F.8 (Multi-location support)** | **Large** | **Critical — enables second center, scopes all resources** |
| 4 | Part B (Design overhaul) | Large | High — first impression, professionalism |
| 5 | C.6 (Admin calendar view) | Medium | Critical — admin daily operations |
| 6 | C.2 (Manual booking creation) | Medium | Critical — walk-ins, phone bookings |
| 7 | C.5 (Exception date ranges + bulk) | Medium | High — tournament/event blocking |
| 8 | C.4 (Instructor schedule date ranges) | Medium | High — realistic scheduling |
| 9 | C.1 (Flexible durations) | Large | High — real product requirement |
| 10 | C.7 (Notes + audit trail) | Small | Medium — operational quality |
| 11 | C.8 (Revenue reporting) | Medium | Medium — business intelligence |
| 12 | C.3 (Rescheduling) | Medium | Medium — reduces cancellation friction |
| 13 | C.9–C.10 (Refunds + status rules) | Small | Medium — data integrity |
| 14 | D.1–D.7 (Admin polish) | Large | Medium — admin quality of life |
| 15 | E.1–E.5 (Additional features) | Large | Low–Med — nice to haves |

---

## Execution Notes

- Part A should be done first as a quick pass (1 session).
- **Parts G then F must be done before other feature work** — they change the schema foundation that everything else builds on.
- Part G (dynamic sports) is a prerequisite for Part F (multi-location) because location-scoped resources reference sports.
- Part G migration path: create `Sport` + `InstructorSport` tables → backfill from enum → swap columns → drop enum. All in one migration batch.
- Part F migration path: create `Location` table → add nullable `locationId` columns → backfill default location → make required. Separate migration batch.
- Part B (design) can run in parallel with G/F schema work if the design agent works on static layouts/CSS first.
- Part C/D booking/admin features should start after G+F are merged so they build on the new schema from day one.
- The calendar view (C.6) and manual booking (C.2) are the most impactful admin features — prioritize these after schema work.
- All changes must preserve: BEM class naming, `@apply` in CSS only, Russian-only UI.
- After each phase: `npm run lint && npm run build` to verify.
- E2E tests will need significant updates for the new booking flow (location step, dynamic sports, flexible durations).
