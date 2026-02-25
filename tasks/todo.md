# Session Todo (2026-02-23)

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

- [ ] Refactor instructor data model to a single trainer price and multiple sports, with Prisma migration and data backfill (remove redundant trainer tier fields and single-sport field).
- [ ] Update all runtime paths (admin instructors, booking availability/persistence/UI, coaches page, hidden `/prices` route, tests) to the new instructor model.
- [ ] Add admin support for editing trainer description + sports + price and surface trainer session history in admin.
- [ ] Refresh `prisma/seed.ts` to an up-to-date, easy-to-edit seed dataset aligned with the new model.
- [ ] Run `prisma generate`/migration + `npm run lint` + `npm run test:unit` + `npm run build` and document review notes.

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
