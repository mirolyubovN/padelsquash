# Next Session Prompt (Copy/Paste)

Use the following prompt to start the redesign execution in a new agent session.

```text
Continue development on D:\\Websites\\padelsquash.

## Read these files first (mandatory)

- tasks/redesign-plan.md — THE master plan. Contains Parts A through G with every task itemized.
- tasks/lessons.md — accumulated lessons and patterns to follow
- docs/next-session-handoff.md — prior session state summary
- docs/devops-postgres.md — Docker/Postgres setup
- prisma/schema.prisma — current DB schema (you'll be modifying this heavily)

## What to do this session

Execute the redesign plan in strict priority order. Each phase must pass verification before moving to the next.

### Phase 1: Part A — QA fixes (quick pass)

Do ALL items in A.1 (placeholder text removal), A.2 (functional bugs), A.3 (orphaned code cleanup), A.4 (minor fixes). These are small targeted edits. Mark each checkbox in redesign-plan.md as you complete it.

Important context for A.2:
- The contact form was intentionally removed — do NOT re-add it.
- Courts and prices pages were intentionally removed from nav — do NOT re-add nav items.
- The WhatsApp number `77000000000` is a placeholder — replace with the siteConfig phone or leave a clear TODO comment.

### Phase 2: Part G — Dynamic sport types (schema migration)

This replaces the hardcoded `Sport` Prisma enum with a `Sport` database table. Follow G.1–G.6 exactly:

1. Create the `Sport` model and `InstructorSport` join table in prisma/schema.prisma
2. Add `sportId` columns alongside existing `sport` enum fields (nullable at first)
3. Write a migration + seed script that:
   - Creates `Sport` rows for "padel" (slug: "padel", name: "Падел") and "squash" (slug: "squash", name: "Сквош")
   - Backfills `sportId` on Court, Service, ComponentPrice from the enum values
   - Migrates `Instructor.sports[]` + `Instructor.pricePerHour` into `InstructorSport` rows
4. Make `sportId` required, drop old `sport` enum columns and `Instructor.pricePerHour`/`Instructor.sports`
5. Drop the `Sport` Prisma enum (rename to avoid collision — the model takes the name)
6. Update ALL code references:
   - `src/lib/domain/types.ts` — remove Sport type alias referencing enum
   - `src/lib/content/site-content.ts` — remove `courtItems`, `sharedCourtSpecs` hardcoded padel/squash
   - Booking form: sport selection from DB, not hardcoded
   - Pricing engine: fetch by `sportId`
   - Availability engine: filter courts by `sportId`
   - Admin pages: sport dropdowns from DB
   - Coaches page: sport tags from `InstructorSport`
   - Homepage: sport sections from DB
7. Create `/admin/sports` CRUD page
8. Update `db:seed` to seed sports first, then reference them

### Phase 3: Part F — Multi-location support (schema migration)

This adds the `Location` model and scopes all resources. Follow F.1–F.8:

1. Create `Location` model and `InstructorLocation` join table
2. Add `locationId` to: Court, OpeningHour, ComponentPrice, ScheduleException, Booking, Service (nullable)
3. Update unique constraints (OpeningHour, ComponentPrice)
4. Migration script:
   - Create one default Location from siteConfig data (name: "Padel & Squash KZ", slug: "main", address from siteConfig)
   - Backfill `locationId` on all existing rows
   - Make `locationId` required
5. Update availability engine to accept and filter by `locationId`
6. Update booking flow: add location step (conditional — only if >1 active location)
7. Update admin: location selector in header, `/admin/locations` CRUD, all pages filter by location
8. Update public pages: contact page shows per-location data, homepage shows location cards if >1

## Rules you MUST follow

- **BEM class naming** in all CSS. No Tailwind utility classes in JSX — use `@apply` in CSS files only.
- **Russian-only UI**. All user-facing text in Russian.
- **Prisma migrations**: Use `npx prisma migrate dev --name <descriptive-name>` for each schema change. Do NOT use `db push`.
- **Seed script**: After schema changes, update `prisma/seed.ts` so `npm run db:seed` works from scratch.
- **No inline styles**. No `style={{}}` in JSX.
- **Preserve existing booking behavior**: auth required, 60-min slots, trainer-first training flow, multi-slot selection, court auto-assignment, query param persistence across auth redirects.
- Track progress by checking off items in `tasks/redesign-plan.md`.
- Update `tasks/lessons.md` if you learn something that should persist.

## Verification (after each phase)

Run these SEPARATELY (not in parallel — they race on test-results/):

```bash
npm run lint
npm run build
npm run test:e2e
```

All three must pass before moving to the next phase. If e2e tests fail due to schema changes, update the tests to match the new schema.

## Important local setup

- Postgres runs in Docker: `docker compose ps` to check, `docker compose up -d` to start
- Generate Prisma client after schema changes: `npx prisma generate`
- Reset DB if needed: `npx prisma migrate reset` (runs seed automatically)
- Run lint and e2e separately (race condition on test-results/)

## Current Prisma schema (key models being changed)

- `Sport` — currently an ENUM (`padel | squash`). Being replaced with a model table (Part G).
- `Court` — has `sport Sport` enum field. Gets `sportId` + `locationId`.
- `Instructor` — has `sports Sport[]` array + flat `pricePerHour`. Replaced by `InstructorSport` join table.
- `Service` — has `sport Sport` enum. Gets `sportId` + optional `locationId`.
- `ComponentPrice` — has `sport Sport` enum. Gets `sportId` + `locationId`.
- `OpeningHour` — currently unique on `dayOfWeek`. Gets `locationId`, unique on `[locationId, dayOfWeek]`.
- `Booking` — gets `locationId` (denormalized for reporting).

## What NOT to do

- Do NOT start Part B (design overhaul) yet — schema must stabilize first.
- Do NOT start Parts C/D (booking system / admin rebuild) — depends on G+F schema.
- Do NOT add i18n or English translations.
- Do NOT change the auth system (Auth.js / NextAuth with Credentials).
- Do NOT modify Docker/Postgres configuration.
```

## Quick Context Snapshot

- Stack: Next.js 16 App Router, Prisma, Postgres (Docker), Auth.js Credentials, Vitest, Playwright
- Locale: Kazakhstan, `KZT`, `Asia/Almaty`, Russian UI
- Booking UX: progressive disclosure, trainer-first training flow, multi-slot + multi-court selection (court mode), query param persistence across auth redirects
- Admin UX: sidebar + mobile drawer, breadcrumbs, dashboard stats, bookings filters/search/pagination
- CSS: BEM naming, Tailwind v4 with `@apply` only (no utility classes in JSX)
- Design: dark header/footer (Club Noir), Oswald display font, orange accent (#f04e23), 85vh hero

## Key Schema Models

- `Sport` — DB table (slug, name, icon, sortOrder, active)
- `Court` — sportId + locationId (active courts only available to their sport)
- `Instructor` — bio, photoUrl, active; sports/prices via InstructorSport join table
- `InstructorSport` — per-sport price (instructorId + sportId → pricePerHour)
- `ResourceSchedule` — sportId? (null = all sports, set = sport-specific availability)
- `Location` — multi-location support; all resources scoped to locationId

## Recent Features (2026-03-05)

### Court selection in booking form
- Court rental: after selecting time slots, court picker shows courts available across ALL selected slots (intersection)
- Multi-court multi-slot: numCourts × numSlots individual API calls on submit
- Price preview multiplies courtPrice × numCourts

### Per-sport trainer pricing
- Admin instructors page: one `price_<sportId>` input per sport (replaces flat global price)
- Create/update functions read per-sport prices from form fields

### Trainer photo
- `Instructor.photoUrl String?` — migration `20260305140000_instructor_photo_schedule_sport`
- Admin: photo URL field in create/edit; Coaches page: photo or initials fallback

### Sport-scoped trainer schedules
- `ResourceSchedule.sportId String?` — null = all sports; set = sport-specific
- Availability engine: `WHERE sportId = service.sportId OR sportId IS NULL`
- Admin schedule page: sport dropdown in add-interval form, sport column in table

## Useful Recovery Commands

```powershell
docker compose ps
docker compose up -d
npx prisma generate
npx prisma migrate dev
npm run db:seed
npm run lint
npm run build
npm run test:e2e
```
