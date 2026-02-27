# Session Todo (2026-02-23)

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
