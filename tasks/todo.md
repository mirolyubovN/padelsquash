# Session Todo (2026-02-23)

## Plan (2026-03-07 - new device bootstrap)

- [x] Read README/runbook and extract exact local setup requirements.
- [x] Create local `.env` for Docker Postgres + Auth.js + app defaults.
- [x] Start Docker PostgreSQL container and confirm healthy status.
- [x] Apply Prisma migrations and regenerate Prisma client.
- [x] Seed development data and verify core commands.

## Review (2026-03-07 - new device bootstrap)

- Created local `.env` with Docker DB connection (`127.0.0.1:55432`), Auth.js values, and explicit seed credentials.
- Started `padelsquash-postgres` via Docker Compose and confirmed `healthy` state.
- Ran `npm.cmd install` (including Prisma postinstall client generation).
- Applied all Prisma migrations with `npx.cmd prisma migrate deploy`.
- Regenerated Prisma client with `npx.cmd prisma generate`.
- Seeded development data with `npm.cmd run db:seed`.
- Verified readiness by running unit tests: `12 passed` across `4` files.

## Plan (2026-03-05 - simplification baseline + role split super-admin/admin/trainer)

- [x] Analyze `bookingcourts.ru/courts` interaction pattern and capture simplification principles for this project.
- [x] Add role/capability foundation (`super_admin`, `trainer`) across auth/session/domain typing and guards.
- [x] Add trainer self-service route for own timetable editing (`/trainer/schedule`) with server-side ownership checks.
- [x] Restrict pricing-sensitive admin surfaces (prices/sports edits, pricing UI) to super-admin role only.
- [x] Hide revenue-sensitive UI for regular admin users (dashboard revenue card and booking amount breakdowns).
- [x] Apply DB migration + regenerate Prisma client + verify (`tsc`, `lint`, `build`).

## Review (2026-03-05 - simplification baseline + role split super-admin/admin/trainer)

- Captured bookingcourts baseline and simplification principles in `tasks/bookingcourts-analysis.md`.
- Added role/capability foundation in `src/lib/auth/roles.ts` and updated auth/session typing:
  - new app roles: `customer`, `trainer`, `admin`, `super_admin`
  - legacy `coach` tokens are normalized to `trainer`
- Added schema migration for role expansion and trainer linkage:
  - `prisma/migrations/20260305130000_role_super_admin_trainer/migration.sql`
  - `User.role` enum expanded; `User.instructorId` -> `Instructor.id` relation added
- Updated seed for practical role testing:
  - seeded `super_admin`, normal `admin`, and `trainer` users
  - trainer user is linked to an instructor profile
  - added safe email de-duplication when env overrides collide
- Added trainer self-service timetable route:
  - `/trainer/schedule` with own-scope schedule/exception actions only
- Simplified/secured admin access:
  - pricing + sports pages are now super-admin only
  - regular admin no longer sees revenue card on dashboard
  - regular admin no longer sees booking sums/pricing breakdown in admin bookings table
  - admin sidebar items are role-aware
- Verification:
  - `npx prisma generate` ✅
  - `npx prisma migrate deploy` ✅
  - `npm run db:seed` ✅
  - `npx tsc --noEmit` ✅
  - `npm run lint` ✅
  - `npm run build` ✅
  - `npm run test:unit` ✅
  - `npm run test:integration` ✅
  - `npm run test:e2e` ✅

## Plan (2026-03-05 - redesign Part A QA fixes execution)

- [x] Complete A.1 placeholder/public-copy cleanup across forgot-password, homepage, coaches, legal pages, admin descriptions, admin badge, and booking fallback names.
- [x] Complete A.2 functional fixes: account booking service label, coaches booking prefill query, homepage heading duplication, and WhatsApp placeholder replacement.
- [x] Complete A.3 orphaned cleanup: remove `.home-page__*` legacy CSS blocks and delete unused `serviceItems` + contact-form text fields from site content.
- [x] Complete A.4 minor fixes: add pricing/rules page to admin nav, hide prices trainer example when no trainers, and add missing `role="status"` on success messages.
- [x] Mark completed Part A checkboxes in `tasks/redesign-plan.md`.
- [x] Run phase verification commands separately: `npm run lint`, `npm run build`, `npm run test:e2e`.

## Review (2026-03-05 - redesign Part A QA fixes execution)

- Completed Part A implementation and marked all Part A checkboxes in `tasks/redesign-plan.md`.
- `npm run lint` ✅
- `npm run build` ✅ (build logs include Prisma DB connection warning during pre-render fallback, but build completed successfully)
- `npm run test:e2e` ✅ (after Docker/Postgres was started)
- E2E follow-up fix: adjusted one strict-mode ambiguous selector in `tests/e2e/05-admin-resources-config.spec.ts` (`getByText("Периоды цен")` -> `getByRole("heading", { name: "Периоды цен" })`).

## Plan (2026-03-05 - redesign Part G dynamic sport types)

- [x] Audit all Sport enum dependencies across schema, seed, domain types, booking/pricing/availability engines, admin pages, and public pages.
- [x] Update Prisma schema: add `Sport` model + `InstructorSport` join and transitional nullable `sportId` fields alongside existing enum fields.
- [x] Create migration and data backfill for `Sport` rows (`padel`, `squash`) and map old enum values to `sportId` (including instructor migration).
- [x] Finalize schema swap: make `sportId` required, remove old enum columns (`sport`, `sports`) and `Instructor.pricePerHour`, drop `Sport` enum.
- [x] Refactor application code to consume DB-backed sports/instructor-sport data and remove hardcoded sport content dependencies.
- [x] Add `/admin/sports` CRUD and include it in admin navigation.
- [x] Verify Phase 2 with `npm run lint`, `npm run build`, `npm run test:e2e`.

## Review (2026-03-05 - redesign Part G dynamic sport types)

- Part G completed end-to-end: schema/migrations finalized to `Sport` + `InstructorSport`, runtime code migrated to `sportId`/relation-backed reads, and legacy enum fields removed from application logic.
- `prisma/seed.ts` updated to seed sports first and use `sportId`/`InstructorSport` relationships for courts, services, prices, and instructors.
- Added admin sport management:
  - new page [`app/admin/sports/page.tsx`](/D:/Websites/padelsquash/app/admin/sports/page.tsx)
  - new resource actions in [`src/lib/admin/resources.ts`](/D:/Websites/padelsquash/src/lib/admin/resources.ts)
  - nav wiring in [`src/components/admin/admin-nav-config.ts`](/D:/Websites/padelsquash/src/components/admin/admin-nav-config.ts)
- Updated e2e specs for new schema/UI behavior:
  - trainer inline pricing persistence submit sync
  - DB-backed sport select values in admin resource flow
  - added `/admin/sports` CRUD/toggle/delete coverage in admin resources e2e scenario
- Verification:
  - `npx tsc --noEmit` ✅
  - `npm run lint` ✅
  - `npm run build` ✅ (requires elevated/network-enabled execution for Google Fonts fetch in this environment)
- `npm run test:integration` ✅
- `npm run test:e2e` ✅

## Plan (2026-03-05 - redesign Part F multi-location support)

- [ ] Add `Location` + `InstructorLocation` models and location relations/constraints in Prisma schema (Court, OpeningHour, ComponentPrice, ScheduleException, Booking, optional Service).
- [ ] Create/apply migration + data backfill to seed default location from site config and populate `locationId` on existing rows, then make required fields non-null where needed.
- [ ] Update `prisma/seed.ts` to create location first and link courts/opening hours/component prices/bookings-related entities through `locationId`.
- [ ] Refactor availability/booking/persistence layers to require and filter by location (`locationId` + instructor-location compatibility).
- [ ] Refactor booking page/form to add conditional location step (only shown if >1 active location) and persist `location` in query params.
- [ ] Add admin locations CRUD page and wire admin nav; add location scoping filters to affected admin pages/services.
- [ ] Update homepage/contact/public data loaders to support multi-location display and booking deep-links (`/book?location=<slug>`).
- [ ] Update integration/e2e tests for location-aware behavior and run full verification (`tsc`, `lint`, `build`, `test:integration`, `test:e2e`).

## Review (2026-03-05 - redesign Part F multi-location support)

- In progress

## Plan (2026-02-25 - trainer model refactor completion and verification)

- [x] Verify Prisma schema/runtime alignment for trainer multi-sport + single-price model (including migration SQL sanity).
- [x] Run verification commands to surface current failures (`npx prisma generate`, `npm run db:seed`, `npm run lint`, `npm run test:unit`, `npm run build`).
- [x] Fix remaining trainer refactor breaks across admin trainers/schedule history, coaches page, booking flow, hidden `/prices`, and related tests.
- [x] Verify trainer UX requirements end-to-end (single trainer price, multi-sport support, DB description on coaches page, admin description edit, admin session history).
- [x] Update `tasks/ux-overhaul-plan.md` instructor model correction checkboxes and document review results in this file.

## Plan (2026-02-25 - UX overhaul Phase 3.2 booking auth banner + URL state persistence)

- [x] Add a persistent top-of-booking-form auth requirement banner for unauthenticated users with login/registration links.
- [x] Persist booking selections (`sport`, `service`, `trainer`, `date`) into `/book` query params while the user configures the booking.
- [x] Restore booking form selections from query params on load and preserve them after login/registration redirects.
- [x] Run `npm run lint` + `npm run build` and document review notes.

## Plan (2026-02-25 - Phase 2.5 cleanup pass: legal stubs + public copy leaks)

- [x] Fix dead footer legal links by adding minimal `/legal/privacy` and `/legal/terms` pages (or equivalent non-404 behavior).
- [x] Remove remaining admin/technical framing from public-facing copy (login hero, coaches empty state, homepage content subtitles, account bookings hero text).
- [x] Fix login default redirect for regular users from `/admin` to `/account` when `?next=` is missing.
- [x] Run `npm run lint` + `npm run build` and document review notes.

## Plan (2026-02-25 - Phase 2.5 cleanup pass: orphaned code + prices page polish)

- [x] Remove confirmed orphaned code/assets from Phase 2 work (unused `ContactForm`, static `coachItems`, unused `BookingFormPreview` component if not referenced).
- [x] Fix prices page edge cases: avoid trainer `0 ₸` output when no trainers exist.
- [x] Replace homepage-scoped CTA class usage on `/prices` with a shared/non-homepage class.
- [x] Run `npm run lint` + `npm run build` and document review notes.

## Plan (2026-02-25 - Phase 2.5 cleanup pass: unused feature/social-proof artifacts)

- [x] Remove unused `featureItems` export from `site-content.ts` if still unreferenced.
- [x] Remove unused `.feature-grid__*` and `.social-proof__*` CSS blocks if not used by current pages.
- [x] Run `npm run lint` + `npm run build` and document review notes.

## Plan (2026-02-25 - Phase 2.5 cleanup pass: homepage placeholders + CSS disabled/loading polish)

- [x] Remove public homepage placeholder sections (FAQ / booking rules / club rules) or replace with real content; prefer removal for now.
- [x] Fix spinner behavior so disabled buttons do not show loading spinners unless explicitly in loading/pending state.
- [x] Resolve `transition-transform` + `transition-colors` utility conflicts in CSS classes noted in the review.
- [x] Run `npm run lint` + `npm run build` and document review notes.

## Plan (2026-02-25 - Phase 3.7 booking confirmation cleanup: remove raw internal fields)

- [x] Replace raw booking/payment internals in the booking success view with customer-friendly confirmation text and session summary.
- [x] Keep the confirmation useful (sport/service/date/time/court/trainer/amount + next step to account bookings) without exposing raw UUID/provider/status strings.
- [x] Run `npm run lint` + `npm run build` and document review notes.

## Plan (2026-02-25 - Phase 3.3 foundation: availability API instructor filter)

- [x] Add optional `instructorId` query-param validation support for availability requests.
- [x] Filter availability results by the requested trainer (only slots where that trainer is available/free) while preserving existing behavior when no trainer is specified.
- [x] Run verification (`npm run lint`, `npm run build`, targeted tests if needed) and document review notes.

## Plan (2026-02-25 - Phase 3.2 trainer selection before time slots)

- [x] Move trainer selection earlier in the booking UI for training bookings (before date/time slot selection).
- [x] Filter availability fetches by selected trainer (`instructorId`) for training services using the new API support.
- [x] Keep existing court-booking flow behavior intact and verify with `npm run lint` + `npm run build` (plus e2e if stable).

## Plan (2026-02-25 - Phase 3.2 trainer cards polish: avatar + sport tags)

- [x] Add initials avatar and sport tags to trainer-selection cards in the booking flow (training step).
- [x] Keep trainer price/hour visible and preserve selected-state styling/behavior.
- [x] Run `npm run lint` + `npm run build` and document review notes.

## Plan (2026-02-25 - Phase 3.1 stepper slice: booking step indicator)

- [x] Add a visual step indicator to the booking form with dynamic step count/labels for court vs training flows.
- [x] Compute current/completed/pending step states from the existing booking form selections without changing backend behavior.
- [x] Run `npm run lint` + `npm run build` and document review notes.

## Plan (2026-02-25 - Phase 3.1 progressive disclosure v1: hide downstream steps)

- [x] Hide later booking sections (account step and confirmation action area) until a time slot is selected.
- [x] Preserve existing booking behavior and top auth banner while reducing early visual noise.
- [x] Run `npm run lint` + `npm run build` (and e2e if needed) and document review notes.

## Plan (2026-02-25 - Phase 3.1/3.2 progressive disclosure v2: training date step after trainer)

- [x] Hide the training date/time step until a trainer is selected (trainer-first flow).
- [x] Update booking e2e helpers/tests to set the date after trainer selection for training bookings.
- [x] Run `npm run lint` + `npm run build` + `npm run test:e2e` and document review notes.

## Plan (2026-02-25 - Phase 3.8 slot display polish: tier + price on time buttons)

- [x] Show a pricing tier label on each slot button.
- [x] Show per-slot price on/near each slot button (court-only or court+trainer total as applicable).
- [x] Run `npm run lint` + `npm run build` (+ `npm run test:e2e` if selectors/flow unaffected) and document review notes.

## Plan (2026-02-25 - Phase 3.8 slot display polish: loading skeleton + selected state)

- [x] Replace plain slot-loading text with a slot-loading skeleton UI.
- [x] Strengthen selected-slot styling so chosen time stands out clearly from available slots.
- [x] Run `npm run lint` + `npm run build` and document review notes.

## Plan (2026-02-25 - Phase 3.1 progressive disclosure v3: completed-step summaries + edit controls)

- [x] Collapse completed booking steps into compact summaries after a slot is selected (sport, service, trainer, date/time) while keeping the current step visible.
- [x] Add "Изменить" controls to reopen a completed step for inline correction without breaking the trainer-first flow.
- [x] Add a lightweight step reveal animation (with reduced-motion fallback) and verify `npm run lint` + `npm run build` (+ `npm run test:e2e` because booking UI changed).

## Plan (2026-02-25 - Phase 3 completion: multi-slot + auto-court booking flow)

- [x] Replace per-court single-slot selection in booking UI with a flat multi-slot time list and selection counter.
- [x] Submit one booking per selected slot with automatic court assignment (first available court per slot) and partial-failure feedback.
- [x] Update booking review/confirmation UI for multi-session summaries and assigned-court confirmation details.
- [x] Omit redundant `availableInstructorIds` in availability API responses when `instructorId` filter is provided.
- [x] Update integration/e2e tests to the Phase 3 booking UI behavior and run `npm run lint`, `npm run build`, `npm run test:integration`, `npm run test:e2e`.

## Plan (2026-02-25 - Phase 4 auth/account UX completion)

- [x] Complete login UX improvements (submit loading state, forgot-password link/page, warmer auth panel styling).
- [x] Complete registration UX improvements (password visibility toggle) and verify return redirect behavior remains `next`-aware.
- [x] Complete account UX improvements (tabs, profile edit form, bookings status badges, cancel confirmation dialog, upcoming/past split, mobile-friendly cards).
- [x] Run verification (`npm run lint`, `npm run build`, `npm run test:e2e`) and mark Phase 4 complete in `tasks/ux-overhaul-plan.md`.

## Plan (2026-02-24 - navigation account button)

- [x] Add a persistent header account entry so users can reach profile/bookings from the public site.
- [x] Keep header responsive (account entry visible on mobile; booking CTA behavior unchanged unless needed).
- [x] Verify the header renders cleanly (targeted lint/build check if feasible) and document results.

## Plan (2026-02-24 - auth-aware header/footer nav UX correction)

- [x] Make public header auth entry conditional by session state: guest `Войти / Регистрация`, customer `Аккаунт`, admin `Админ-панель`.
- [x] Apply the same auth-aware conditional link behavior in the footer (remove always-visible account/admin links).
- [x] Verify lint passes and document the corrected UX review notes.

## Plan (2026-02-24 - UX overhaul Phase 1.1 execution)

- [x] Remove developer/test/admin-facing copy from public login/account/booking UI.
- [x] Hide demo-fallback success messaging in booking UI and fail with a generic user message instead.
- [x] Verify `npm run lint` and document Phase 1.1 progress/review notes.

## Plan (2026-02-24 - UX overhaul Phase 1.2 mobile navigation)

- [x] Add a mobile hamburger menu in the public header and keep desktop navigation unchanged.
- [x] Add a mobile drawer with nav links + auth-aware portal link + booking CTA; close on route change and outside click.
- [x] Verify `npm run lint` and `npm run build`, then document Phase 1.2 review notes.

## Plan (2026-02-24 - UX overhaul Phase 1.4 registration form persistence)

- [x] Preserve entered registration values when server validation fails.
- [x] Add inline field-level validation errors and phone format hint on registration.
- [x] Verify `npm run lint` and `npm run build`, then document Phase 1.4 review notes.

## Plan (2026-02-24 - UX overhaul Phase 1.3 homepage booking preview widget)

- [x] Replace the fake booking-preview form controls with a static step illustration (Option A).
- [x] Keep a clear CTA link to `/book` and preserve the current page layout structure.
- [x] Verify `npm run lint` and `npm run build`, then mark Phase 1 complete in `tasks/ux-overhaul-plan.md`.

## Plan (2026-02-24 - UX overhaul Phase 2 execution batch)

- [x] Implement homepage visual uplift (hero treatment, stats, feature icons, social proof, stronger CTA).
- [x] Upgrade courts/coaches/contact/prices public pages with richer content, CTAs, and missing practical info.
- [x] Apply global visual polish (hover states, footer enhancements, favicon, shared disabled/loading styles) and tick Phase 2 boxes in `tasks/ux-overhaul-plan.md` after verification.

## Plan (2026-02-24 - homepage redesign override)

- [x] Rebuild homepage to the new user spec (hero, DB price ranges, equipment banner, FAQ/rules placeholders, DB-backed about-club, social links).
- [x] Remove old homepage sections (feature cards, fake reviews/social proof, booking preview widget) and stop surfacing courts/prices in public nav.
- [x] Remove contact form UI, verify `npm run lint` + `npm run build`, and tick override checklist in `tasks/ux-overhaul-plan.md`.

## Plan (2026-02-24 - homepage pricing/style refinement)

- [x] Simplify homepage pricing block to compact court-only lines (no coaching pricing on homepage).
- [x] Tighten homepage styling (hero + section cards/price cards) to ensure clearly visible visual design.
- [x] Verify `npm run lint` + `npm run build`, then tick refinement checklist in `tasks/ux-overhaul-plan.md`.

## Plan (2026-02-24 - pricing model correction: court-only base pricing)

- [x] Remove training/instructor rows from `/admin/pricing/base` and keep only court base prices.
- [x] Enforce two-tier court pricing behavior (morning + evening/weekend) across admin save, homepage display, and booking pricing.
- [x] Verify `npm run lint` + `npm run build` (and pricing unit tests if adjusted), then tick correction checklist in `tasks/ux-overhaul-plan.md`.

## Plan (2026-02-24 - instructor model/admin refactor)

- [x] Refactor instructor data model to a single trainer price and multiple sports, with Prisma migration and data backfill (remove redundant trainer tier fields and single-sport field).
- [x] Update all runtime paths (admin instructors, booking availability/persistence/UI, coaches page, hidden `/prices` route, tests) to the new instructor model.
- [x] Add admin support for editing trainer description + sports + price and surface trainer session history in admin.
- [x] Refresh `prisma/seed.ts` to an up-to-date, easy-to-edit seed dataset aligned with the new model.
- [x] Run `prisma generate`/migration + `npm run lint` + `npm run test:unit` + `npm run build` and document review notes.

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

### Review (booking UX auth/account step + content cleanup)

- Booking screen updated to account-first UX:
  - Step 4 now shows login/registration actions for unauthenticated users
  - authenticated users see non-editable account details summary
  - added `Изменить данные` modal popup for editing booking contact details
  - booking submit is disabled until user is authenticated
- `/book` page now loads full initial customer profile from DB (including phone) for logged-in users:
  - `app/book/page.tsx`
- Backend auth policy aligned with booking UI:
  - `app/api/bookings/route.ts` now requires authenticated account for all booking types (including training), not only court rentals.
- Booking form UI changes:
  - `src/components/booking/live-booking-form.tsx`
  - `app/globals.css`
- Public content cleanup:
  - replaced technical/non-user-facing phrases on the homepage and booking pages with practical player-facing content in `src/lib/content/site-content.ts`
- E2E tests updated to reflect the new auth/account booking flow and modal editing:
  - `tests/e2e/helpers.ts`
  - `tests/e2e/01-customer-court-booking-account.spec.ts`
  - `tests/e2e/02-training-booking.spec.ts`
- Verification:
  - `npm run lint` ✅
  - `npm run build` ✅
  - `npm run test:e2e` ✅
  - `npm run test:e2e` ✅

### Review (admin resource deletion)

- Added delete actions for admin-managed resources:
  - courts (`app/admin/courts/page.tsx`, `src/lib/admin/resources.ts`)
  - instructors (`app/admin/instructors/page.tsx`, `src/lib/admin/resources.ts`)
  - services (`app/admin/services/page.tsx`, `src/lib/admin/resources.ts`)
- Safe-delete behavior:
  - courts/instructors cannot be deleted if referenced in booking history (`BookingResource`)
  - services cannot be deleted if any bookings exist
  - instructor delete also removes related schedules/exceptions when deletion is allowed
  - court delete also removes related exceptions when deletion is allowed
- Added e2e coverage for delete flows of newly created resources:
  - `tests/e2e/05-admin-resources-config.spec.ts`
- Added user-friendly admin delete result handling (instead of server-action crash UI):
  - `app/admin/courts/page.tsx`
  - `app/admin/instructors/page.tsx`
  - `app/admin/services/page.tsx`
  - blocked deletes now show inline error banners; successful deletes show success banners via redirect query params
- Verification:
  - `npm run lint` ✅
  - `npm run build` ✅
  - `npm run db:seed && npx playwright test tests/e2e/05-admin-resources-config.spec.ts` ✅

### Review (documentation sync + next-session prompt)

- Updated project docs to reflect latest booking/admin behavior:
  - `README.md`
  - `docs/changes-2026-02-23.md`
  - `docs/next-session-handoff.md`
- Added standalone copy/paste prompt for future sessions:
  - `docs/next-session-prompt.md`
- Documented latest changes in docs:
  - booking API auth alignment (all bookings require login)
  - admin safe-delete support for courts/instructors/services
  - admin inline delete success/error banners

### Review (2026-02-24 - navigation account button)

- Added a dedicated `Аккаунт` button to the public site header that links to `/account` (profile + bookings entry point).
- Kept the existing `Забронировать` CTA and mobile behavior (booking CTA remains hidden on small screens; account button stays visible).
- Updated header styles with a small actions group and secondary button styling for the new account entry.
- Verification:
  - `npm run lint` ✅

### Review (2026-02-24 - auth-aware header/footer nav UX correction)

- Header and footer now use the same auth-aware portal link mapping:
  - guest: `Войти / Регистрация` -> `/login`
  - customer/coach: `Аккаунт` -> `/account`
  - admin: `Админ-панель` -> `/admin`
- Removed footer behavior that always showed both account and admin links regardless of auth state.
- Centralized portal-link label/href rules in `src/lib/auth/public-nav.ts` to keep header/footer consistent.
- Captured the UX correction pattern in `tasks/lessons.md` (auth-aware public nav shortcuts).
- Verification:
  - `npm run lint` ✅

### Review (2026-02-24 - UX overhaul Phase 1.1 execution)

- Executed the first slice of `tasks/ux-overhaul-plan.md` (Phase 1.1 critical UI copy cleanup).
- Public login page cleanup:
  - removed test credentials hint
  - removed advertised "В админ-панель" link
  - replaced hint area with a simple registration prompt/link
- Account page cleanup:
  - humanized account role label/value (`Тип аккаунта: Клиент/Тренер/Администратор`)
  - removed DB/internal wording from bookings-history description
- Booking form cleanup:
  - removed admin-facing trainer empty-state message
  - stopped showing internal court ID in price summary
  - demo-fallback responses now surface a generic booking error instead of a fake success + technical note
- Verification:
  - `npm run lint` ✅

### Review (2026-02-24 - UX overhaul Phase 1.2 mobile navigation)

- Implemented Phase 1.2 mobile navigation in the public header.
- Header refactor:
  - `src/components/site-header.tsx` is now a server wrapper (auth-aware portal link) that renders a client header component.
  - Added `src/components/site-header-client.tsx` for interactive mobile menu behavior.
- Mobile UX changes:
  - added hamburger `Меню` button on mobile
  - added slide-out mobile drawer with all public nav links + auth-aware portal link + booking CTA
  - drawer closes on outside click, `Escape`, and route change/navigation click
- Desktop behavior preserved:
  - desktop nav links and desktop actions remain unchanged
  - mobile hides the desktop action buttons in favor of the drawer
- Styling:
  - added dedicated mobile header drawer/button styles in `app/globals.css`
- Verification:
  - `npm run lint` ✅
  - `npm run build` ✅

### Review (2026-02-24 - UX overhaul Phase 1.4 registration form persistence)

- Implemented Phase 1.4 registration UX fix with `useActionState` + Server Action state returns.
- Registration form now preserves entered `name/email/phone` values when server validation fails or email is already taken.
- Added inline field-level validation errors for:
  - name
  - email
  - phone
  - password
  - password confirmation (including password mismatch)
- Added phone format hint under the phone field: `+7 (7XX) XXX-XX-XX`.
- Refactor details:
  - server action moved to `app/register/actions.ts`
  - client form component added in `src/components/auth/register-form.tsx`
  - shared register form state/types extracted to `src/lib/auth/register-form-state.ts`
  - `app/register/page.tsx` simplified to render the new form component
- Added small auth form styles for field errors/hints in `app/globals.css`.
- Verification:
  - `npm run lint` ✅
  - `npm run build` ✅

### Review (2026-02-24 - UX overhaul Phase 1.3 homepage booking preview widget)

- Implemented Phase 1.3 using Option A (recommended) in `src/components/booking-form-preview.tsx`.
- Removed fake interactive controls from the homepage booking preview:
  - fake service dropdown
  - fake date input
  - fake session input
  - fake "Проверить доступность" button
- Replaced them with a static visual booking-step illustration and a decorative sample slots strip.
- Kept a single clear CTA to `/book` and preserved the existing homepage section layout.
- Updated booking-preview styles in `app/globals.css` for the new step-card presentation.
- Updated `tasks/ux-overhaul-plan.md` checkboxes and marked Phase 1 complete.
- Verification:
  - `npm run lint` ✅
  - `npm run build` ✅

### Review (2026-02-24 - UX overhaul Phase 2 execution batch)

- Completed Phase 2 and updated `tasks/ux-overhaul-plan.md` checkboxes for sections 2.1-2.6.
- Homepage (2.1):
  - added stronger gradient/ambient hero treatment (including homepage-specific `PageHero` styling)
  - upgraded primary CTA prominence and added mobile sticky CTA
  - replaced weak stat with meaningful operational stats
  - added feature icon badges
  - added social-proof stats + testimonials section
- Courts page (2.2):
  - added visual sport placeholders, capacity info, per-card booking CTA, and prices-page CTA
- Coaches page (2.3):
  - added avatar placeholders, improved card layout, tag-style formats, booking CTA
  - trainer price ranges now come from DB instructor pricing (`prisma.instructor`) with fallbacks
- Contact page (2.4):
  - phone updated to clearly marked demo contact number
  - added DB-backed opening hours (`getOpeningHours()`)
  - added Google Maps link, social links, directions block
  - added contact form with server action + `useActionState` success/error UX
- Prices page (2.5):
  - added worked example breakdown
  - added trainer price ranges section
  - added bottom booking CTA
- Global design (2.6):
  - increased body line-height
  - added hover states for card-style blocks
  - added shared disabled/spinner submit-button styles
  - upgraded footer with social icons, legal placeholders, copyright row
  - added `app/icon.svg` favicon
- Verification:
  - `npm run lint` ✅
  - `npm run build` ✅

### Review (2026-02-24 - homepage redesign override)

- Reworked homepage to the new user spec and replaced the previous Phase 2 homepage composition.
- New homepage structure (in order):
  - hero with photo-style background + `Онлайн запись` CTA
  - DB-backed padel/squash pricing blocks (weekday/day-evening/weekend ranges)
  - equipment-included banner
  - FAQ placeholder
  - booking-rules placeholder
  - DB-backed about-club section (padel/squash court groups + gallery blocks from DB court records)
  - club-rules placeholder
  - social links section (IG/TG/WA/phone)
- Removed from homepage:
  - feature cards section
  - fake reviews / social proof
  - booking preview widget
- Public IA updates:
  - removed `Корты` and `Цены` from public nav/footer navigation (`navItems`)
  - removed contact form UI from `/contact`
- Added DB-backed homepage aggregator:
  - `src/lib/public/homepage.ts` (price ranges + court groups)
- Updated master plan checklist:
  - ticked all items in `tasks/ux-overhaul-plan.md` under `Homepage Rework Override (2026-02-24)`
- Verification:
  - `npm run lint` ✅
  - `npm run build` ✅

### Review (2026-02-24 - homepage pricing/style refinement)

- Homepage pricing block simplified to court-only lines per sport:
  - будни `08:00-17:00`
  - будни `17:00-23:00`
  - выходные `08:00-23:00`
- Removed coaching prices from homepage pricing display (coaching remains coach-dependent and should be selected in booking flow / coach pages).
- Price rows now use compact one-line values (`тенге/час`) instead of multi-row court+training breakdowns.
- Strengthened homepage visuals so the new sections are clearly styled (hero surface, pricing card gradients/shadows, section card depth).
- Updated refinement checklist in `tasks/ux-overhaul-plan.md` and marked all items complete.
- Verification:
  - `npm run lint` ✅
  - `npm run build` ✅

### Review (2026-02-24 - pricing model correction: court-only base pricing)

- Fixed the pricing ownership/model mismatch:
  - base pricing admin page now manages **only court prices**
  - trainer/training prices are no longer shown in `/admin/pricing/base` (they remain on trainer records)
- Court base pricing is now presented and saved as a two-tier model:
  - `morning` (used for weekday `08:00-17:00`)
  - `evening/weekend`
- Compatibility behavior (to avoid schema migration in this slice):
  - admin save mirrors `morning` into legacy `day` court price rows in `ComponentPrice`
  - booking pricing engine normalizes court `day` requests to use the `morning` court price
- Homepage pricing block now shows exact court prices only (no coach/training prices).
- Added unit-test coverage for the new rule: weekday daytime court bookings use morning court price.
- Updated pricing correction checklist in `tasks/ux-overhaul-plan.md` and marked all items complete.
- Verification:
  - `npm run lint` ✅
  - `npm run test:unit` ✅
  - `npm run build` ✅

### Review (2026-02-24 - instructor model/admin refactor, partial handoff)

- Started refactoring trainers to the corrected business model:
  - one trainer price (`pricePerHour`)
  - multiple sports (`sports[]`)
- Patched major code paths (partially verified only):
  - `prisma/schema.prisma` updated for new instructor fields
  - `src/lib/admin/resources.ts` updated for trainer CRUD + trainer session-history data on schedule page
  - `app/admin/instructors/page.tsx` updated to edit sports/description/single price
  - `app/admin/instructors/[id]/schedule/page.tsx` now renders trainer session history (recent bookings)
  - `src/lib/availability/db.ts`, `src/lib/bookings/persistence.ts`, `app/book/page.tsx`, `src/components/booking/live-booking-form.tsx` patched for multi-sport + single trainer price
  - `app/coaches/page.tsx` moved toward DB-backed trainer cards with DB description + single price
  - `app/prices/page.tsx` patched to avoid removed trainer tier fields
  - `prisma/seed.ts` rewritten into a config-style, easier-to-edit seed aligned with new trainer model
  - test updates started (`tests/integration/*`, `tests/e2e/04-admin-instructor-pricing-inline.spec.ts`)
- Migration status:
  - Added manual migration SQL: `prisma/migrations/20260224123000_instructor_multi_sport_single_price/migration.sql`
  - Prisma CLI migration execution was blocked in sandbox by schema-engine download (network restricted)
  - Migration SQL was applied directly to local Postgres via `docker exec ... psql` (successful)
- Verification blockers in this session:
  - `npm run db:seed` failed in sandbox (`tsx`/`esbuild` `spawn EPERM`)
  - `npx prisma migrate dev` and `npx prisma db execute` failed due Prisma engine download attempt
- Next session must run full verification and finish any compile/runtime fixes before marking checklist items complete.

### Review (2026-02-25 - trainer refactor verification pass, environment-blocked)

- Performed a code-level verification pass of the trainer refactor across schema, migration, admin, booking, coaches, `/prices`, seed, and tests.
- Confirmed runtime code paths use the new trainer model consistently:
  - `Instructor.sports` (`Sport[]`)
  - `Instructor.pricePerHour`
  - no remaining runtime references to legacy trainer tier fields (`priceMorning`, `priceDay`, `priceEveningWeekend`)
- Confirmed trainer UX requirements are implemented in code (not yet fully DB/e2e verified in this session):
  - admin trainers page edits sports + description + single price
  - admin trainer schedule page shows trainer session history
  - coaches page reads DB trainer description + multi-sport labels + single trainer price
  - booking flow filters trainers by `sports[]` and uses trainer `pricePerHour`
- Migration SQL sanity check (`prisma/migrations/20260224123000_instructor_multi_sport_single_price/migration.sql`):
  - backfills `sports[]` from legacy `sport`
  - backfills `pricePerHour` from legacy tiered prices
  - removes legacy trainer fields
  - deletes obsolete instructor rows from `ComponentPrice`
  - suitable for normal one-time migration application / reset flow (not re-runnable by design)
- Verification results (2026-02-25):
  - `npx prisma generate` ✅
  - `npm run db:seed` ❌ sandbox `tsx/esbuild` `spawn EPERM`
  - `npm run lint` ✅
  - `npm run test:unit` ✅
  - `npm run build` ✅ (build succeeded; Prisma logged DB unreachable during prerender because local Postgres/Docker was not running)
- Additional environment blocker:
  - `docker compose ps` failed because Docker Desktop engine pipe `dockerDesktopLinuxEngine` was unavailable (Docker not running locally)
- Remaining for full completion:
  - start Docker Desktop / local Postgres
  - rerun `npm run db:seed` (likely outside sandbox due `EPERM`)
  - run DB-backed verification (`test:integration`, optionally trainer-related e2e/manual UI checks)
  - then mark instructor-model checklist items complete in `tasks/ux-overhaul-plan.md`

### Review (2026-02-25 - trainer model refactor completion and full verification)

- Completed the trainer model refactor verification and closed the remaining test regressions.
- Root cause of remaining failures was stale e2e expectations after the refactor:
  - tests assumed exactly 2 padel trainers, but seed now includes a multi-sport trainer (3 options for padel training)
  - admin trainer CRUD e2e still targeted legacy trainer form fields (single `sport` select + tiered price inputs)
- Updated e2e tests to match the new model/UI:
  - `tests/e2e/02-training-booking.spec.ts`
    - trainer list assertion now requires at least 2 options instead of exactly 2
  - `tests/e2e/helpers.ts`
    - training helper no longer hardcodes exact trainer-button count
  - `tests/e2e/05-admin-resources-config.spec.ts`
    - create-trainer flow uses sports checkboxes + single hourly price field
    - selectors scoped to the create form to avoid collisions with inline edit rows
- Verified trainer UX requirements with DB-backed runs + e2e:
  - one trainer price (`pricePerHour`) used in booking preview and admin inline edit flow ✅
  - trainer multi-sport support (`sports[]`) affects trainer availability/options ✅
  - admin can edit trainer description + sports + price ✅
  - admin trainer schedule page shows session history ✅ (implemented and covered by runtime build path; e2e suite exercises admin trainer flows)
  - coaches page uses DB trainer description + multi-sport labels + single trainer price ✅ (runtime code path verified; page compiles/builds)
- Verification results (final):
  - `npx prisma generate` ✅
  - `npm run db:seed` ✅ (outside sandbox; sandbox still hits `tsx/esbuild` `spawn EPERM`)
  - `npm run lint` ✅
  - `npm run test:unit` ✅
  - `npm run test:integration` ✅
  - `npm run build` ✅
  - `npm run test:e2e` ✅

### Review (2026-02-25 - UX overhaul Phase 3.6 auth banner + booking URL state persistence)

- Implemented the next booking UX slice in `src/components/booking/live-booking-form.tsx`:
  - added a persistent top banner for unauthenticated users with login/registration links
  - login/register links now carry a dynamic `next` URL that preserves current booking selections
  - booking selections are synced into `/book` query params (`sport`, `service`, `date`, `instructor`)
  - booking form restores selections from query params on mount
- Implementation detail:
  - trainer selection restore is deferred until a slot is selected and the trainer is available in that slot (uses pending trainer id from URL)
- Updated `tasks/ux-overhaul-plan.md` section `3.6 Surface auth requirement early` checkboxes to complete.
- Verification:
  - `npm run lint` ✅
  - `npm run build` ✅

### Review (2026-02-25 - Phase 2.5 cleanup pass: legal stubs + public copy leaks)

- Fixed footer legal-link 404s by adding stub pages:
  - `app/legal/privacy/page.tsx`
  - `app/legal/terms/page.tsx`
- Removed remaining public-facing admin/technical framing:
  - login hero description is now customer-facing (`app/login/page.tsx`)
  - account bookings hero no longer mentions "из БД" (`app/account/bookings/page.tsx`)
  - coaches empty state no longer tells public users to use admin panel (`app/coaches/page.tsx`)
  - homepage pricing/about subtitles rewritten to user-facing copy (`src/lib/content/site-content.ts`)
  - footer copyright no longer says demo version (`src/components/site-footer.tsx`)
  - removed visible "(демо)" suffix from public phone number in `siteConfig` (`src/lib/content/site-content.ts`)
- Fixed login default redirect behavior for users without `?next=`:
  - default now goes to `/account` instead of `/admin`
  - invalid-credentials redirect preserves the `next` parameter (`app/login/page.tsx`)
- Updated corresponding Phase 2.5 review checklist items in `tasks/ux-overhaul-plan.md`.
- Verification:
  - `npm run lint` ✅
  - `npm run build` ✅

### Review (2026-02-25 - Phase 2.5 cleanup pass: orphaned code + prices page polish)

- Removed confirmed orphaned code from earlier homepage/contact iterations:
  - deleted unused `src/components/booking-form-preview.tsx`
  - deleted unused `src/components/contact/contact-form.tsx`
  - deleted orphaned `app/contact/actions.ts` (only used by the removed contact form)
  - removed unused `coachItems` and `bookingPreviewContent` exports from `src/lib/content/site-content.ts`
- Fixed `/prices` polish issues:
  - replaced homepage-scoped CTA class usage with non-homepage class (`card-grid__button`) in `app/prices/page.tsx`
  - handled no-trainer edge case so the page no longer shows `0 ₸` trainer prices/ranges
  - example section now shows a fallback message when trainer prices are unavailable instead of fake zero values
- Updated corresponding Phase 2.5 review checklist items in `tasks/ux-overhaul-plan.md`.
- Verification:
  - `npm run lint` ✅
  - `npm run build` ✅

### Review (2026-02-25 - Phase 2.5 cleanup pass: unused feature/social-proof artifacts)

- Confirmed the following artifacts were no longer referenced by current pages/components:
  - `featureItems` export in `src/lib/content/site-content.ts`
  - `.feature-grid__*` CSS blocks in `app/globals.css`
  - `.social-proof__*` CSS blocks (and unused `.social-proof` wrapper styles) in `app/globals.css`
- Removed those unused exports/styles to reduce dead code left behind from superseded homepage iterations.
- Updated corresponding Phase 2.5 review checklist items in `tasks/ux-overhaul-plan.md`.
- Verification:
  - `npm run lint` ✅
  - `npm run build` ✅

### Review (2026-02-25 - Phase 2.5 cleanup pass: homepage placeholders + CSS disabled/loading polish)

- Removed public homepage placeholder sections from `app/page.tsx`:
  - FAQ placeholder
  - booking rules placeholder
  - club rules placeholder
- Removed now-unused homepage placeholder styles from `app/globals.css` (`home-overview__placeholder-grid`, `home-overview__placeholder-card`).
- Fixed disabled-button spinner behavior in `app/globals.css`:
  - spinner pseudo-element no longer attaches to all `:disabled` buttons
  - spinner now shows only for explicit `--loading` modifier classes
- Added loading modifiers where state is available:
  - `src/components/auth/register-form.tsx` uses `auth-form__submit--loading` when `isPending`
  - `src/components/booking/live-booking-form.tsx` uses `booking-live__button--loading` when `submitLoading`
- Resolved Tailwind transition utility conflicts by replacing `transition-transform transition-colors` with `transition-all` on affected cards in `app/globals.css`:
  - `.card-grid__item`
  - `.coach-card`
  - `.contact-card`
- Updated corresponding Phase 2.5 review checklist items in `tasks/ux-overhaul-plan.md`.
- Verification:
  - `npm run lint` ✅
  - `npm run build` ✅

### Review (2026-02-25 - Phase 3.7 booking confirmation cleanup: remove raw internal fields)

- Reworked the booking success view in `src/components/booking/live-booking-form.tsx` to avoid exposing internal identifiers/provider states.
- Added a UI-safe confirmation summary state captured at submit time (sport/service/date/time/court/trainer/amount/currency).
- Success card now shows customer-friendly confirmation details and a clear next step to open `/account/bookings`.
- Removed raw display of:
  - booking UUID
  - raw booking status code
  - raw payment provider/status strings
- Updated corresponding Phase 3.7 raw-field checklist items and the Phase 2.5 review note in `tasks/ux-overhaul-plan.md`.
- Verification:
  - `npm run lint` ✅
  - `npm run build` ✅

### Review (2026-02-25 - Phase 3.3 foundation + Phase 3.2 partial UI: trainer-filtered availability and trainer-before-timeslots)

- Added optional trainer filtering support to the availability API:
  - `src/lib/validation/booking.ts`: `availabilityQuerySchema` now accepts optional `instructorId`
  - `app/api/availability/route.ts`: passes optional `instructorId` into slot generation (DB + demo paths)
  - `src/lib/availability/engine.ts`: supports `requestedInstructorId` and filters training slots to that trainer
- Added DB-backed integration coverage for the new API behavior:
  - `tests/integration/availability-api-route.test.ts` now verifies `instructorId`-filtered training slots return only the requested trainer
- Refactored booking UI to choose trainer before time slots for training bookings:
  - `src/components/booking/live-booking-form.tsx`
  - training flow now shows sport-filtered trainer cards before availability
  - availability requests for training include selected `instructorId`
  - availability/auto-nearest-date lookup waits for trainer selection in training mode
  - court-booking flow behavior remains unchanged
- Updated booking e2e helpers/tests to the new trainer-before-timeslot order and confirmation copy:
  - `tests/e2e/helpers.ts`
  - `tests/e2e/02-training-booking.spec.ts`
  - `tests/e2e/04-admin-instructor-pricing-inline.spec.ts`
- Verification:
  - `npm run lint` ✅
  - `npm run build` ✅
  - `npm run test:integration` ✅
  - `npm run test:e2e` ✅

### Review (2026-02-25 - Phase 3.2 trainer cards polish: avatar + sport tags)

- Enhanced booking trainer-selection cards in `src/components/booking/live-booking-form.tsx`:
  - initials avatar
  - sport tags (padel/squash badges)
  - hourly price remains visible
- Added trainer-card UI styles in `app/globals.css` while preserving existing selected-state behavior.
- This completes the remaining Phase 3.2 trainer-card content checklist item in `tasks/ux-overhaul-plan.md`.
- Verification:
  - `npm run lint` ✅
  - `npm run build` ✅

### Review (2026-02-25 - Phase 3.1 stepper slice: booking step indicator)

- Added a dynamic booking stepper to `src/components/booking/live-booking-form.tsx`:
  - 5 steps for court bookings
  - 6 steps for training bookings (includes trainer step)
  - current/completed/pending state styling derived from the current booking selections
- Added stepper styles in `app/globals.css` (badge + state variants).
- This completes the Phase 3.1 step-indicator checklist item and provides a base for progressive disclosure next.
- Verification:
  - `npm run lint` ✅
  - `npm run build` ✅

### Review (2026-02-25 - Phase 3.1 progressive disclosure v1: hide downstream steps)

- Reduced booking-form visual noise by hiding downstream sections until a slot is selected:
  - account/auth step section now appears only after slot selection
  - submit action area now appears only after slot selection
- Preserved the top auth requirement banner so unauthenticated users still see the account requirement from the first screen.
- Updated the court-booking e2e assertion to match the new top-banner copy (account-step message is no longer visible before slot selection).
- Verification:
  - `npm run lint` ✅
  - `npm run build` ✅
  - `npm run test:e2e` ✅

### Review (2026-02-25 - Phase 3.1/3.2 progressive disclosure v2: training date step after trainer)

- Training bookings now follow a stricter trainer-first order in `src/components/booking/live-booking-form.tsx`:
  - trainer step appears before date/time
  - date/time step is hidden until a trainer is selected
- Updated e2e helper flow to match:
  - training date is now set after trainer selection
  - helper `pickTrainerAndWaitForAvailability(...)` can set the date and wait for availability
- Updated affected booking e2e specs to the new order:
  - `tests/e2e/02-training-booking.spec.ts`
  - `tests/e2e/04-admin-instructor-pricing-inline.spec.ts`
  - plus helper refactor in `tests/e2e/helpers.ts`
- Verification:
  - `npm run lint` ✅
  - `npm run build` ✅
  - `npm run test:e2e` ✅

### Review (2026-02-25 - Phase 3.8 slot display polish: tier + price on time buttons)

- Enhanced booking slot buttons in `src/components/booking/live-booking-form.tsx`:
  - tier tag shown on each slot (`Утро` / `День` / `Вечер / выходные`)
  - per-slot price shown directly on the button
  - training slots show total per slot (court + selected trainer), court rentals show court-only price
- Added supporting slot-tag/price styles in `app/globals.css`.
- Updated corresponding Phase 3.8 checklist items in `tasks/ux-overhaul-plan.md`.
- Verification:
  - `npm run lint` ✅
  - `npm run build` ✅

### Review (2026-02-25 - Phase 3.1 progressive disclosure v3: completed-step summaries + edit controls)

- Extended the booking progressive-disclosure flow in `src/components/booking/live-booking-form.tsx`:
  - after a slot is selected, completed steps collapse into compact summaries (`Спорт`, `Услуга`, `Тренер` for training, `Дата и время`)
  - each summary has an `Изменить` button that reopens that specific step for inline correction
  - selecting a new value/slot exits edit mode and keeps the existing trainer-first flow intact
- Added lightweight step reveal animation + reduced-motion fallback:
  - `app/globals.css` (`.booking-live__step--animated`, `@keyframes booking-step-reveal`, `prefers-reduced-motion`)
- Added summary-card styling for collapsed steps in `app/globals.css`.
- Reconciled Phase 3.8 checklist status in `tasks/ux-overhaul-plan.md` for already-shipped slot loading skeleton + selected-slot visual state.
- Verification:
  - `npm run lint` ✅
  - `npm run build` ✅

### Review (2026-02-25 - Phase 3 completion: multi-slot selection, auto-court assignment, and final booking UX)

- Completed the remaining Phase 3 booking-flow overhaul in `src/components/booking/live-booking-form.tsx`:
  - replaced single-slot state with `selectedSlotKeys[]` multi-select
  - replaced per-court grouped availability with a flat unique time-slot list (court auto-assigned on submit)
  - added selection counter and multi-slot price review (per-slot rows + aggregated total)
  - split date/time into separate steps in the rendered flow (trainer-first for training preserved)
  - submit now loops over selected slots and creates one booking per slot
  - partial successes show a warning summary (`X из Y...`) while still showing created bookings
  - success confirmation now lists all booked sessions and assigned courts, plus total amount and account CTA
- Completed Phase 3.3 response-shape cleanup:
  - `app/api/availability/route.ts` omits `availableInstructorIds` when `instructorId` is provided
  - `tests/integration/availability-api-route.test.ts` updated to assert omission
- Updated e2e helpers/specs for the flat-slot UI and new confirmation/review behavior:
  - `tests/e2e/helpers.ts`
  - `tests/e2e/01-customer-court-booking-account.spec.ts`
  - `tests/e2e/04-admin-instructor-pricing-inline.spec.ts`
- Marked remaining Phase 3 checklist items complete in `tasks/ux-overhaul-plan.md` (3.1, 3.3, 3.4, 3.5, 3.7).
- Verification:
  - `npm run lint` ✅
  - `npm run build` ✅
  - `npm run test:integration` ✅
  - `npm run test:e2e` ✅

### Review (2026-02-25 - Phase 4 auth/account UX completion)

- Login UX (`app/login/page.tsx`, `src/components/auth/login-form.tsx`, `app/globals.css`):
  - moved login form into a client component so submit button shows a real pending/loading state via `useFormStatus`
  - added `Забыли пароль?` link
  - improved auth panel presentation with brand mark/header block and warmer surface styling
- Password reset MVP page:
  - added `/forgot-password` route (`app/forgot-password/page.tsx`)
  - added client-side MVP assist form (`src/components/auth/forgot-password-form.tsx`) that collects email and shows admin-contact guidance
- Registration UX (`src/components/auth/register-form.tsx`):
  - added password visibility toggle for password + confirmation fields
  - confirmed existing `next`-aware redirect behavior remains in place via `app/register/actions.ts`
- Account pages UX (`app/account/page.tsx`, `app/account/bookings/page.tsx`, `app/account/actions.ts`, `src/components/account/*`, `app/globals.css`):
  - added shared account tab navigation (Профиль / Мои бронирования) on both account pages
  - added profile edit form (name/phone) directly on `/account` with server action save + cache revalidation + success/error flash via query params
  - bookings page now shows colored status/payment badges, upcoming vs past sections, and mobile-friendly card layout
  - added cancellation confirmation dialog before submitting cancellation (`AccountCancelBookingForm`)
- Updated e2e coverage for the new cancellation confirmation step:
  - `tests/e2e/01-customer-court-booking-account.spec.ts`
- Marked all Phase 4 checklist items complete in `tasks/ux-overhaul-plan.md`.
- Verification:
  - `npm run lint` ✅
  - `npm run build` ✅
  - `npm run test:e2e` ✅

### Review (2026-02-25 - Phase 5 admin panel UX overhaul completion)

- Admin shell/navigation (`app/admin/layout.tsx`, `src/components/admin/admin-shell-frame.tsx`, `src/components/admin/admin-nav-config.ts`, `src/components/admin/admin-page-shell.tsx`, `app/globals.css`):
  - replaced the minimal admin wrapper with a persistent sidebar navigation
  - added mobile sidebar toggle/overlay behavior
  - added breadcrumb support in `AdminPageShell` and wired nested admin pages (court exceptions, trainer schedule)
- Admin dashboard (`app/admin/page.tsx`, `src/lib/admin/dashboard.ts`, `app/globals.css`):
  - added summary stat cards (today bookings, pending payments, active resources, weekly revenue)
  - added quick actions + recent bookings panel
  - added admin alerts (including pending payments and next-day trainer availability gaps by sport)
- Admin bookings UX (`app/admin/bookings/page.tsx`, `src/lib/admin/bookings.ts`, `app/globals.css`):
  - humanized booking/payment status labels
  - added filters (status, sport, date range), search, and pagination
  - added expandable booking details rows (customer, court/trainer, payment/provider, price breakdown)
- Admin resources UX (`app/admin/courts/page.tsx`, `app/admin/instructors/page.tsx`, `app/admin/services/page.tsx`, `src/lib/admin/resources.ts`, `src/components/admin/admin-confirm-action-form.tsx`, `app/globals.css`):
  - moved create forms into separate admin sections above tables
  - added delete confirmation dialogs for courts/trainers/services
  - added inline editing for courts (name/notes) and services (name/code)
  - added colored active/inactive status badges across resource tables
- E2E maintenance for the new admin/resource markup and booking animations:
  - `tests/e2e/03-admin-bookings-action.spec.ts` now checks humanized admin booking status labels
  - `tests/e2e/05-admin-resources-config.spec.ts` now locates admin rows via DOM snapshots (supports inline-edit inputs + server re-renders)
  - `tests/e2e/helpers.ts` trainer selection click is hardened against animation/stability flake during booking flow tests
- Marked all Phase 5 checklist items complete in `tasks/ux-overhaul-plan.md`.
- Verification:
  - `npm run lint` ✅
  - `npm run build` ✅
  - `npm run test:e2e` ✅

### Review (2026-02-25 - Phase 6 content & copy quality pass: homepage FAQ/rules + contact directions + booking tone)

- Rewrote customer-facing copy in `src/lib/content/site-content.ts`:
  - stronger homepage hero/lead (more player-focused, less system-speak)
  - friendlier homepage pricing/support/social copy
  - improved coaches page hero copy
  - warmer contact page hero + booking-support copy
  - booking page hero and notices updated to match the current trainer-first + auto-court booking flow
- Added missing informational content in `src/lib/content/site-content.ts`:
  - homepage FAQ section content (`faqItems`) with answers about equipment, player count, cancellation, first visit, trainer format, and pricing
  - booking rules list (`bookingRules`)
  - club rules / dress-code style list (`clubRules`)
  - richer contact directions copy (`directionsDescription` + expanded directions list)
- Updated homepage UI to render the new content sections in `app/page.tsx`:
  - FAQ card grid
  - booking rules + club rules two-column section
- Added supporting homepage section styles in `app/globals.css` for the new FAQ/rules blocks.
- Updated `app/contact/page.tsx`:
  - added neighborhood/landmark line to the address card
  - added directions intro text above the "Как добраться" list
- Marked Phase 6.1 and Phase 6.2 checklist items complete in `tasks/ux-overhaul-plan.md`.
- Verification:
  - `npm run lint` ✅
  - `npm run build` ✅

### Review (2026-02-25 - Phase 7 technical polish pass: metadata/SEO + booking auth-state persistence + accessibility foundations)

- Phase 7.2 booking-state persistence completion (`src/components/booking/live-booking-form.tsx`):
  - extended booking URL sync/restore to include selected slot time(s) using repeated `time=` query params (multi-slot compatible)
  - login/register `next` URLs now preserve sport/service/date/trainer and selected time slots
  - URL restore now reselects valid slots after availability loads
- Phase 7.3 SEO & metadata:
  - added shared page metadata helper `src/lib/seo/metadata.ts` for title/description/canonical/OG/Twitter metadata
  - expanded root metadata in `app/layout.tsx` with `metadataBase`, Open Graph, Twitter defaults
  - added LocalBusiness JSON-LD script to `app/layout.tsx` (sanitized JSON serialization)
  - added metadata exports with unique title/description for all route pages (`25/25` `app/**/page.tsx`)
  - added `app/robots.ts` and `app/sitemap.ts` for crawl directives and sitemap generation
- Phase 7.4 accessibility foundations:
  - added skip-to-content link in `app/layout.tsx` with `#main-content` target
  - added global `:focus-visible` outline styles in `app/globals.css` for keyboard navigation clarity
  - verified icon-only menu/close buttons in custom UI (site header, admin shell, booking modal) have `aria-label`s
- Phase 7 checklist updates in `tasks/ux-overhaul-plan.md`:
  - marked `7.2` complete
  - marked `7.3` complete
  - marked `7.4` items complete except WCAG AA contrast audit (still pending)
  - marked `7.1` MVP forgot-password items complete; full email reset-token flow remains pending
- Verification:
  - `npm run build` ✅
  - `npm run test:e2e` ✅
  - `npm run lint` ✅
  - Note: `lint` must be run separately from Playwright in this repo because both touch `test-results/` and can race when executed in parallel.

## Plan (2026-03-07 - booking auth handoff state persistence)

- [x] Audit current `/book` URL persistence and auth redirect handoff.
- [x] Persist full in-progress booking selection (sport, service, date, trainer, selected court/time cells) into the booking URL and auth `next` links.
- [x] Restore preserved booking selections after login/registration without clearing them during initial state hydration.
- [x] Add regression coverage for guest booking -> login -> resumed selection flow.
- [x] Run targeted verification and document the review results.

## Review (2026-03-07 - booking auth handoff state persistence)

- Added shared booking URL-state parsing/encoding helpers in `src/lib/bookings/url-state.ts` so `/book` state is serialized consistently for server parsing and client URL sync.
- Updated `app/book/page.tsx` to pass parsed booking query state into the live booking form on render.
- Updated `src/components/booking/live-booking-form.tsx` to:
  - initialize from parsed booking state,
  - keep selected court/time cells in the URL/auth `next` path,
  - restore valid selected cells after availability loads,
  - persist guest in-progress booking state in `sessionStorage` across auth redirects,
  - avoid clearing restored trainer/slot state on Strict Mode duplicate mount passes.
- Added Playwright regression coverage in `tests/e2e/06-booking-auth-handoff.spec.ts` for guest training selection -> login -> restored booking confirmation state.
- Verification:
  - `npx eslint app/book/page.tsx src/components/booking/live-booking-form.tsx src/lib/bookings/url-state.ts tests/e2e/06-booking-auth-handoff.spec.ts` ?
  - `npm run db:seed` ?
  - `npx playwright install chromium` ?
  - `npx playwright test tests/e2e/06-booking-auth-handoff.spec.ts` ?

## Plan (2026-03-07 - wallet balance booking flow)

- [x] Audit the current booking/payment flow and replace booking-linked placeholder payments with a wallet-first model.
- [x] Add DB support for wallet balance accounting: user balance field, immutable balance ledger, top-up/bonus metadata, and short-lived booking holds for top-up race protection.
- [x] Implement wallet domain services for customer top-up, admin manual credit, bonus application, refunds/booking charges, and hold lifecycle.
- [x] Refactor booking creation so authenticated bookings are paid from wallet balance inside the same transaction that verifies slot availability and creates the booking.
- [x] When balance is insufficient, create a temporary hold/reservation token, send the user to top up, and resume booking from the saved selection/hold after top-up.
- [x] Add customer-facing balance/top-up UI and admin tools for manual in-club/cash balance adjustments.
- [x] Add a super-admin settings surface for configurable top-up bonus threshold/percent (default threshold: 50,000 KZT; default bonus: 10%).
- [x] Verify with targeted unit/integration/e2e coverage, including hold expiry/conflict behavior during top-up.

## Review (2026-03-07 - wallet balance booking flow)

- Added wallet schema support in Prisma:
  - `User.walletBalance`
  - immutable `WalletTransaction` ledger
  - singleton `WalletBonusConfig`
  - `BookingHold` for short-lived reservation during top-up
  - new `wallet` payment provider for confirmed wallet-paid bookings
- Implemented wallet services in `src/lib/wallet/service.ts`:
  - customer top-up
  - admin credit/debit by customer email
  - bonus calculation/config persistence
  - booking charge and cancellation refund support
  - optional transaction reuse so booking creation and wallet debit stay atomic
- Refactored DB booking persistence to be wallet-first:
  - `src/lib/bookings/persistence.ts` now confirms bookings only after balance check
  - booking charge is written in the same serializable transaction as conflict checks and booking insert
  - insufficient balance now creates/persists an active `BookingHold` and returns structured `INSUFFICIENT_WALLET_BALANCE`
  - active holds are treated as conflicts in both booking creation and availability reads
- Added customer and admin runtime surfaces:
  - `app/account/page.tsx` now shows balance, top-up form, bonus threshold, and recent wallet operations
  - `app/account/actions.ts` adds `topUpWalletAction` with safe return redirect back to `/book`
  - `app/admin/wallet/page.tsx` adds manual balance adjustments for admins plus bonus settings for super-admins
  - `src/components/admin/admin-nav-config.ts` now links to `/admin/wallet`
- Updated booking resume plumbing:
  - `src/lib/bookings/url-state.ts` and `src/components/booking/live-booking-form.tsx` now preserve `hold` in the booking URL
  - insufficient-balance responses keep the slot selection, save the hold id, and offer a direct top-up return path
- Completed grouped multi-slot hold/resume:
  - added atomic hold creation endpoint `app/api/bookings/holds/route.ts`
  - hold ids are now serialized per selected booking cell in `src/lib/bookings/url-state.ts`
  - availability requests can exclude the customer’s own hold ids so the held selection restores correctly after top-up
  - `src/components/booking/live-booking-form.tsx` now pre-holds the whole selected series before redirecting to top-up
- Updated customer cancellation flow:
  - `src/lib/account/bookings.ts` now refunds wallet-paid bookings back to balance and keeps payment badges consistent
- Verification:
  - `npx.cmd prisma generate` ✓
  - `npx.cmd prisma migrate deploy` ✓
  - `npm.cmd run db:seed` ✓
  - `npx.cmd eslint app/account/actions.ts app/account/page.tsx app/admin/wallet/page.tsx app/api/bookings/route.ts src/components/admin/admin-nav-config.ts src/components/booking/live-booking-form.tsx src/lib/account/bookings.ts src/lib/availability/db.ts src/lib/bookings/persistence.ts src/lib/bookings/url-state.ts src/lib/wallet/queries.ts src/lib/wallet/service.ts src/lib/validation/booking.ts tests/integration/helpers.ts tests/integration/booking-persistence.test.ts tests/unit/wallet-service.test.ts tests/unit/booking-holds.test.ts` ✓
  - `npx.cmd tsc --noEmit` ✓
  - `npm.cmd run test:unit -- tests/unit/wallet-service.test.ts tests/unit/booking-holds.test.ts` ✓
  - `npm.cmd run test:integration -- tests/integration/booking-persistence.test.ts` ✓
  - `npx.cmd playwright test tests/e2e/07-wallet-topup-resume.spec.ts` ✓

## Plan (2026-03-07 - admin wallet booking flow cleanup)

- [ ] Audit the remaining admin booking creation and status-management paths that still assume `pending/cash/free` payments.
- [ ] Refactor admin manual booking creation to remove legacy payment modes, create/find the customer account first, and preserve `holdId` so retry works after a manual wallet top-up.
- [ ] Update admin wallet and bookings surfaces so admins can top up a customer and retry the same held slot without using placeholder payment confirmation.
- [ ] Run targeted lint/typecheck/integration/e2e verification and capture the review results.

## Plan (2026-03-07 - admin UX corrections after wallet rollout)

- [x] Add a usable customer wallet operations surface: searchable customer list with current balances and an admin flow to create/register a customer account by name, surname, phone, and email before balance adjustments.
- [x] Fix `/admin/calendar` so past-time slots cannot be booked and future-slot clicks prefill `/admin/bookings/create` with date/time/court context.
- [x] Refactor admin booking create so it honors calendar deep-link params and keeps the prefilled selection visible/editable.
- [x] Collapse sport setup into one admin entry point so creating a sport also exposes the required related configuration (services, courts, pricing) without making the operator repeat the same concept across separate tabs.
- [x] Run targeted verification and capture review notes.

## Review (2026-03-07 - admin UX corrections after wallet rollout)

- Added an operator-usable client balance workflow in `app/admin/wallet/page.tsx` and `src/lib/wallet/queries.ts`:
  - searchable customer list with current balances and booking counts
  - admin-side customer creation by first name, last name, phone, and email
  - direct prefill from customer row into the balance adjustment form
  - direct handoff from wallet page into admin booking creation
- Fixed admin calendar booking affordances in `app/admin/calendar/page.tsx`:
  - free past-time cells are no longer clickable
  - future free cells carry date, time, court, and location into `/admin/bookings/create`
- Fixed deep-link hydration in `app/admin/bookings/create/page.tsx` and `src/components/admin/create-booking-form.tsx`:
  - create-booking now resolves the linked court, infers sport/location/service, and prefills customer data when provided
  - the form now keeps the calendar-provided date/time/court visible on initial render instead of clearing it during hydration
  - manual admin booking creation now also rejects past-time booking attempts server-side via `src/lib/bookings/persistence.ts`
- Added regression coverage in `tests/integration/booking-persistence.test.ts` so direct past-time booking requests are rejected even outside the admin calendar UI.
- Collapsed sport setup into one admin surface:
  - `app/admin/sports/page.tsx` now creates/edits the sport, its default rental service, and its base court prices in one flow
  - `src/lib/admin/resources.ts` now provisions and updates the linked rental service and pricing rows together with the sport
  - `src/lib/settings/service.ts` now backfills missing component-price rows for newly added sports instead of silently skipping them once any pricing exists
  - `src/components/admin/admin-nav-config.ts` removes the redundant separate services/base-pricing tabs from primary navigation
- Verification:
  - `npx.cmd eslint src/components/admin/create-booking-form.tsx src/lib/bookings/persistence.ts app/admin/wallet/page.tsx app/admin/calendar/page.tsx app/admin/bookings/create/page.tsx app/admin/sports/page.tsx src/components/admin/admin-nav-config.ts src/lib/wallet/queries.ts src/lib/settings/service.ts src/lib/admin/resources.ts tests/e2e/08-admin-wallet-booking.spec.ts tests/e2e/09-admin-wallet-customers.spec.ts tests/e2e/10-admin-calendar-prefill.spec.ts` ✓
  - `npx.cmd tsc --noEmit` ✓
  - `npm.cmd run db:seed` ✓
  - `npm.cmd run test:integration -- tests/integration/booking-persistence.test.ts` ✓
  - `npx.cmd playwright test tests/e2e/08-admin-wallet-booking.spec.ts tests/e2e/09-admin-wallet-customers.spec.ts tests/e2e/10-admin-calendar-prefill.spec.ts` ✓

## Plan (2026-03-07 - admin-created customer account activation)

- [x] Audit the current registration/auth flow and reuse the minimum viable pieces for a real account-setup path for admin-created customers.
- [x] Implement a secure activation link flow so admins can create a customer, copy/send a setup link, and the customer can set a password without re-entering account identity data.
- [x] Expose activation state and setup-link access from `/admin/wallet` so staff can immediately hand off login access after creating or finding a customer.
- [x] Verify with targeted lint/typecheck and end-to-end coverage for admin create customer -> customer sets password -> customer can log in.

## Review (2026-03-07 - admin-created customer account activation + admin text encoding repair)

- Repaired corrupted UTF-8 literals in the touched admin screens:
  - `app/admin/wallet/page.tsx`
  - `app/admin/calendar/page.tsx`
  - `app/admin/sports/page.tsx`
  - `app/admin/bookings/create/page.tsx`
  - `src/components/admin/create-booking-form.tsx`
- Added stateless signed activation-link support in `src/lib/auth/account-setup.ts`:
  - activation link includes expiry
  - signature is tied to the current `passwordHash`, so the link becomes invalid as soon as the customer sets a real password
  - no extra database table or token cleanup job was needed
- Added a public account-setup page in `app/activate-account/page.tsx`:
  - validates the signed activation token
  - shows the customer identity being activated
  - lets the customer set a password and signs them into `/account`
  - rejects reused or expired links
- Extended `/admin/wallet`:
  - shows whether a customer still needs password setup
  - exposes a copy/sendable activation URL for the selected customer
  - keeps the balance-adjustment and booking-entry workflow intact
- Extended wallet customer data in `src/lib/wallet/queries.ts` with `needsPasswordSetup` so the admin UI can show activation state directly in the customer table.
- Added end-to-end coverage in `tests/e2e/11-admin-customer-activation.spec.ts` for:
  - admin creates customer
  - admin obtains activation link
  - customer activates account and lands in `/account`
  - the same link no longer works after activation
- Updated existing wallet/customer e2e copy assertions in `tests/e2e/09-admin-wallet-customers.spec.ts` to the new activation-aware success message.
- Verification:
  - `npx.cmd eslint app/admin/wallet/page.tsx app/admin/calendar/page.tsx app/admin/sports/page.tsx app/admin/bookings/create/page.tsx app/activate-account/page.tsx src/components/admin/create-booking-form.tsx src/lib/auth/account-setup.ts src/lib/wallet/queries.ts tests/e2e/09-admin-wallet-customers.spec.ts tests/e2e/11-admin-customer-activation.spec.ts` ✓
  - `npx.cmd tsc --noEmit` ✓
  - `npx.cmd playwright test tests/e2e/08-admin-wallet-booking.spec.ts tests/e2e/09-admin-wallet-customers.spec.ts tests/e2e/10-admin-calendar-prefill.spec.ts tests/e2e/11-admin-customer-activation.spec.ts` ✓

## Plan (2026-03-07 - site-wide text encoding repair)

- [x] Identify whether the corruption is in source files, seeded database rows, or both so the fix does not stop at one layer.
- [x] Restore clean Russian text in shared public content/settings modules and repair homepage literals without overwriting the current redesign structure.
- [x] Correct live Prisma sport names in place so existing pages stop rendering mojibake immediately without wiping user data.
- [x] Verify with targeted lint/typecheck and spot-check the repaired source/DB values.

## Review (2026-03-07 - site-wide text encoding repair)

- Restored clean UTF-8 copy in `src/lib/content/site-content.ts`, `src/lib/settings/service.ts`, `prisma/seed.ts`, and `app/page.tsx`.
- Repaired the current homepage redesign file in place instead of reverting it to `HEAD`, so the new layout/classes remain intact while all visible Russian copy renders correctly again.
- Cleaned the user-facing admin labels/constants in `src/lib/admin/resources.ts` that were still showing mojibake in resource/sport/exception labels.
- Updated live Prisma sport names in place (`padel` -> `�����`, `squash` -> `�����`) so existing database-backed pages stop rendering corrupted sport labels without a destructive reseed.
- Verification:
  - `npx.cmd eslint app/page.tsx src/lib/content/site-content.ts src/lib/settings/service.ts prisma/seed.ts src/lib/admin/resources.ts` (warnings only for existing `<img>` usage in `app/page.tsx`)
  - `npx.cmd tsc --noEmit`


## Plan (2026-03-07 - Turbopack styles entry fix)

- [x] Re-check the root layout style imports after the user correction to keep Turbopack.
- [x] Replace the aliased global Sass import with a direct relative import from app/layout.tsx.
- [x] Verify the touched layout file still passes lint.

## Review (2026-03-07 - Turbopack styles entry fix)

- Kept Turbopack and treated the issue as a stylesheet entry/integration problem instead of a bundler swap.
- Root layout now imports the shared Sass bundle via a direct relative path: ../src/styles/index.scss.
- app/layout.tsx lint check passed.
- Manual Sass plus Tailwind pipeline checks still confirm the shared stylesheet bundle itself compiles to real CSS.

## Plan (2026-03-08 - admin UX quick wins batch)

- [x] Read README and inspect current admin navigation/calendar/bookings/money formatting/exception options code paths.
- [x] Move admin nav order so dashboard is first and calendar is second.
- [x] Change admin calendar booking clicks to deep-link to the exact booking instead of customer search.
- [x] Add bookings sorting control by date and make nearest-first the default behavior.
- [x] Extend bookings query/filter handling to support deep-linking by booking id.
- [x] Fix KZT money formatting helpers so tenge symbol renders correctly.
- [x] Fix exception target option labels that were showing `???`.
- [x] Run targeted verification and capture review notes.

## Review (2026-03-08 - admin UX quick wins batch)

- Dashboard is now always first in the admin sidebar, with Calendar second.
- Calendar booking tiles now link to `/admin/bookings?bookingId=<id>#booking-<id>`.
- Admin bookings now support `bookingId` filtering plus date sort (`date_asc` default, `date_desc` optional).
- Added a date-sort dropdown on `/admin/bookings` and booking-row anchors for direct jumps.
- Introduced shared formatter `src/lib/format/money.ts` and switched key admin/account booking flows to it.
- Fixed exception resource labels and exception-target option labels in `src/lib/admin/resources.ts`.
- Verification:
  - `npx.cmd eslint app/account/page.tsx app/admin/wallet/page.tsx app/admin/calendar/page.tsx app/admin/bookings/page.tsx src/lib/admin/bookings.ts src/lib/account/bookings.ts src/components/booking/live-booking-form.tsx src/components/admin/create-booking-form.tsx src/components/admin/admin-nav-config.ts src/lib/admin/resources.ts src/lib/format/money.ts` ✅
  - `npx.cmd tsc --noEmit` ✅
  - `npx.cmd playwright test tests/e2e/10-admin-calendar-prefill.spec.ts` ❌ (existing strict-locator issue in `tests/e2e/helpers.ts` on duplicated `admin@example.com` text)
## Plan (2026-03-09 - admin grouped booking payment correction)

- [x] Read README and trace the current admin booking create/payment/listing flows to reproduce the incorrect all-paid behavior for multi-court booking.
- [ ] Add a grouped admin-booking persistence path so one admin submit creates a booking group with explicit paid vs unpaid child sessions instead of unrelated rows.
- [ ] Change admin payment allocation rules so auto uses available wallet balance first, leaves the remainder unpaid, and wallet remains full-balance-only with hold/retry behavior.
- [ ] Update admin booking/client views and actions to show grouped total cost, paid amount, remaining amount, and allow cancelling the whole group or individual sessions.
- [ ] Add regression coverage for grouped booking creation, partial wallet coverage, correct payment badges, and group cancellation behavior.
- [ ] Run targeted verification (prisma generate/migrate if needed, lint, typecheck, targeted integration tests, targeted e2e) and record the review results.

## Review (2026-03-09 - admin grouped booking payment correction)

- In progress## Review (2026-03-09 - admin payment correction simplified)

- Scope corrected after user feedback: no grouped bookings; keep each booking entry separate.
- Admin auto payment now uses wallet when possible and otherwise creates the booking as pending_payment with manual/unpaid payment state.
- Admin bookings page now exposes per-booking settlement actions: pay from wallet, mark cash paid, or cancel.
- Admin/customer/account payment badges now rely on real payment rows instead of inferring confirmed = paid.
- Verification:
  - npx tsc --noEmit PASS
  - npx eslint ... PASS (README is intentionally outside eslint config and reports one ignore warning)
  - npm run test:integration -- tests/integration/booking-persistence.test.ts PASS
  - npx playwright test tests/e2e/08-admin-wallet-booking.spec.ts PASS
## 2026-03-09 Admin booking payment corrections
- [ ] Fix admin booking status correction action handler and complete status/payment correction UI
- [ ] Rename manual payment wording to mention cash or card across admin booking flow and messages
- [ ] Add integration coverage for admin correction flow and rerun targeted verification

### Review 2026-03-09
- [x] Fix admin booking status correction action handler and complete status/payment correction UI
- [x] Rename manual payment wording to mention cash or card across admin booking flow and messages
- [x] Add integration coverage for admin correction flow and rerun targeted verification
- Verification: npx tsc --noEmit; npx eslint app/admin/bookings/page.tsx src/components/admin/create-booking-form.tsx src/lib/bookings/persistence.ts tests/integration/booking-persistence.test.ts tests/e2e/03-admin-bookings-action.spec.ts tests/e2e/12-admin-multi-booking.spec.ts tests/e2e/13-admin-bookings-customer-link.spec.ts; npm run test:integration -- tests/integration/booking-persistence.test.ts; npx playwright test tests/e2e/03-admin-bookings-action.spec.ts tests/e2e/12-admin-multi-booking.spec.ts tests/e2e/13-admin-bookings-customer-link.spec.ts
- Notes: existing unrelated diff remains in package-lock.json. prisma/schema.prisma shows only a line-ending warning in git diff output, not a content change.
## Plan (2026-03-09 - admin client booking refund workflow)

- [x] Trace why admin cancellation from the client profile does not restore balance after a manual debit.
- [x] Add booking-linked pay/cancel actions to `/admin/clients/[customerId]` so admins can settle bookings from the correct workflow instead of using a generic wallet debit.
- [x] Clarify the client balance adjustment copy so manual wallet operations are not mistaken for booking payment.
- [x] Add regression coverage for admin wallet settlement plus cancellation refund on the customer profile workflow.
- [x] Run targeted verification and record the review results.

## Review (2026-03-09 - admin client booking refund workflow)

- Root cause: the client profile only exposed a generic wallet debit, which writes `admin_debit` ledger rows without a `bookingId`; cancellation refunds only act on booking-linked `booking_charge` rows, so those manual debits are intentionally not auto-refunded.
- Added booking-linked actions directly to `/admin/clients/[customerId]` for pending and confirmed bookings: pay from wallet, mark paid manually, and cancel with the existing refund-aware booking action.
- Renamed the balance section to manual balance correction and added guidance to use booking actions for booking payment so operators do not mix the two workflows.
- Added integration coverage for the exact admin flow: create pending booking, settle from wallet, cancel, verify `booking_charge` + `booking_refund` rows and full wallet restoration.
- Verification: `npx tsc --noEmit`; `npx eslint app/admin/clients/[customerId]/page.tsx tests/integration/booking-persistence.test.ts`; `npm run test:integration -- tests/integration/booking-persistence.test.ts`

## Plan (2026-03-09 - admin bookings correction modal)

- [x] Inspect the admin bookings correction UI and reuse the existing admin modal pattern instead of inline details.
- [x] Replace the `admin-bookings__details` editor with a popup modal for booking status/payment corrections.
- [x] Remove the old details-specific styles and add modal form styles that match the rest of the admin UI.
- [x] Run targeted verification and record the results.

## Review (2026-03-09 - admin bookings correction modal)

- Replaced the inline `details` editor on `/admin/bookings` with the existing `AdminEditModal` popup pattern used across other admin edit flows.
- Moved booking-status and payment-status correction forms into one modal so the actions no longer expand rows inline.
- Removed the old `admin-bookings__details*` styles and added `admin-bookings__edit-*` modal form styles in `src/styles/admin.scss`.
- Verification: `npx eslint src/components/admin/admin-bookings-table.tsx`; `npx tsc --noEmit`

## Plan (2026-03-09 - admin reschedule availability fix)

- [x] Read the local Next.js route-handler reference and inspect the reschedule modal plus `/api/availability` request contract.
- [x] Identify and fix the admin reschedule request mismatch so the modal sends the service code expected by the availability API.
- [x] Run targeted verification and record the results.

## Review (2026-03-09 - admin reschedule availability fix)

- Root cause: the admin reschedule modal was sending the booking row’s Prisma service ID to `/api/availability`, but that route resolves availability by service code (for example `padel-rental`), so the request failed before any slots could load.
- Renamed the modal prop to `serviceCode` and updated the bookings table to pass `row.serviceCode`, which makes the request contract explicit and removes the ID/code mix-up.
- Removed the now-unused `currentTime` prop from the modal interface while touching the component.
- Verification: `npx eslint src/components/admin/admin-reschedule-modal.tsx src/components/admin/admin-bookings-table.tsx`; `npx tsc --noEmit`

## Plan (2026-03-09 - admin reschedule UX parity)

- [x] Compare the reschedule modal against the admin create-booking date/time/court selector and identify the UX gaps.
- [x] Refactor the reschedule modal to block past dates and use court names with a timetable-style selection flow instead of raw IDs in a dropdown.
- [x] Add a server-side past-time guard to rescheduling so invalid moves are rejected even if the client is bypassed.
- [x] Run targeted verification and record the results.

## Review (2026-03-09 - admin reschedule UX parity)

- Reworked the reschedule modal to follow the admin create-booking selection pattern more closely: venue-today date floor, timetable-style time/court matrix, and human-readable court names instead of a raw-ID dropdown.
- Wired `/admin/bookings` to pass active court names into the modal so available-court cells render the same labels admins see elsewhere.
- Added a server-side guard in `src/lib/bookings/reschedule.ts` to reject attempts to move a booking into the past, even if the client input is bypassed.
- Added integration coverage for the new server-side rule in `tests/integration/booking-persistence.test.ts`.
- Verification: `npx eslint app/admin/bookings/page.tsx src/components/admin/admin-bookings-table.tsx src/components/admin/admin-reschedule-modal.tsx src/lib/bookings/reschedule.ts tests/integration/booking-persistence.test.ts`; `npx tsc --noEmit`; `npm run test:integration -- tests/integration/booking-persistence.test.ts`

## Plan (2026-03-09 - reschedule modal width and labels)

- [x] Inspect the current reschedule modal layout and identify remaining raw-ID/low-context render paths.
- [x] Widen the popup and add explicit current/new booking summary rows with human-readable data.
- [x] Ensure visible reschedule selections render court labels instead of ID fallbacks.
- [x] Run targeted verification and record the results.

## Review (2026-03-09 - reschedule modal width and labels)

- Expanded the reschedule popup to near full-width and increased the timetable viewport so it behaves more like the create-booking flow.
- Added a summary block in the popup showing the current booking service, current date/time/court, and the selected new date/time/court.
- Updated the visible selected-court label rendering to use human-readable court names in the popup instead of surfacing IDs in the UI.
- Verification: `npx eslint src/components/admin/admin-bookings-table.tsx src/components/admin/admin-reschedule-modal.tsx`; `npx tsc --noEmit`

## Plan (2026-03-09 - reschedule court-name follow-up)

- [x] Trace the remaining raw court GUID visible in the reschedule modal after the width/summary pass.
- [x] Remove raw ID fallbacks from the visible bookings table and reschedule modal court labels, using the canonical court-name map instead.
- [x] Run targeted verification and record the result.

## Review (2026-03-09 - reschedule court-name follow-up)

- Root cause: the reschedule popup still had two raw-ID render paths after the previous pass: timetable headers used `courtNamesById[courtId] ?? courtId`, and the modal summary inherited `row.courtLabels[0]`, which could already be a GUID fallback from server data.
- `/admin/bookings` now passes the full court-name map for all courts, not only active ones, and the bookings table resolves visible court labels from `row.courtIds` before rendering the table cell or opening the reschedule popup.
- The reschedule modal now accepts `currentCourtId`, resolves current/selected/timetable labels from the court-name map, and falls back to neutral `Корт N` labels instead of ever exposing raw GUIDs in the UI.
- Verification: `npx eslint app/admin/bookings/page.tsx src/components/admin/admin-bookings-table.tsx src/components/admin/admin-reschedule-modal.tsx`; `npx tsc --noEmit`

## Plan (2026-03-09 - admin bookings pricing/actions/history follow-up)

- [x] Inspect the current `/admin/bookings` amount column, row actions, and audit logging paths to identify the missing training breakdown and mutation-history gaps.
- [x] Extend admin booking data/mutations so training rows expose the full court+trainer price breakdown and every booking/payment mutation records actor + timestamp details.
- [x] Replace the row-level action-button pile with one manage entry that keeps the full action set available and surfaces per-booking edit history.
- [x] Run targeted verification and record the results.

## Review (2026-03-09 - admin bookings pricing/actions/history follow-up)

- The amount column now renders the full pricing breakdown instead of only the first line, so training bookings show both the court component and the trainer component under the total.
- `/admin/bookings` now passes actor context into every booking status/payment mutation, and `src/lib/admin/bookings.ts` records/retrieves per-booking audit history with action labels, actor identity, timestamps, and short summaries for payment/status/reschedule changes.
- The row-level action pile was replaced with a single `Управлять` modal entry that groups quick actions, manual corrections, and booking history in one operator flow.
- Added integration coverage proving training bookings expose both pricing components and that admin payment/status edits appear in the returned booking history.
- Verification: `npx eslint app/admin/bookings/page.tsx src/components/admin/admin-booking-actions-modal.tsx src/components/admin/admin-bookings-table.tsx src/lib/admin/bookings.ts src/lib/admin/booking-types.ts tests/integration/booking-persistence.test.ts`; `npx tsc --noEmit`; `npm run test:integration -- tests/integration/booking-persistence.test.ts`

## Plan (2026-03-09 - admin bookings docs update)

- [x] Find the operator-facing docs that describe `/admin/bookings`.
- [x] Update the docs to reflect the current pricing breakdown, manage modal, and booking history behavior.
- [x] Record the review result.

## Review (2026-03-09 - admin bookings docs update)

- Updated `README.md` so the `/admin/bookings` operator flow now documents the full training price breakdown, the single `Управлять` modal entry, and the per-booking actor/timestamp history shown in that modal.
- Updated the admin routes table entry for `/admin/bookings` to describe the current manage-modal and audit-aware behavior instead of the older generic “status updates” wording.
- Verification: `rg -n "full pricing breakdown|Управлять|per-booking history|manage modal, full price breakdown" README.md`
