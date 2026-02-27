# UX & Design Overhaul Plan

> Comprehensive gap analysis and step-by-step implementation plan.
> Review each phase, mark items to skip/modify, then hand off to an agent for execution.

---

## Homepage Rework Override (2026-02-24)

User-requested replacement for the current homepage direction (supersedes recent homepage feature/review-heavy version).

- [x] Hero section with club-photo-style background, title, and primary CTA `Онлайн запись`
- [x] Padel/Squash pricing block with DB-backed price ranges for:
  - будни `08:00-17:00`
  - будни `17:00-23:00`
  - выходные `08:00-23:00`
- [x] Equipment-included banner
- [x] FAQ section placeholder (content later)
- [x] Rules section placeholder (content later)
- [x] About club section with DB-backed padel/squash court data and gallery blocks
- [x] Club rules section placeholder (content later)
- [x] Social links section on homepage (IG, TG, WA, phone)
- [x] Remove feature section / fake reviews / booking preview widget from homepage
- [x] Do not surface courts/prices pages in public navigation (homepage becomes primary source)
- [x] Remove contact form UI

### Homepage Rework Override Refinement (2026-02-24)

- [x] Simplify homepage price display to court-only lines (no coaching prices on homepage)
- [x] Present sport prices in compact line format (weekday day / weekday evening / weekend)
- [x] Rework homepage visual styling so all new sections are clearly styled and readable

### Pricing Model Correction (2026-02-24)

- [x] Admin base pricing (`/admin/pricing/base`) shows only court prices (no training/instructor rows)
- [x] Court base pricing uses only two sets: `morning` and `evening/weekend`
- [x] Weekday daytime court bookings (08:00-17:00) use the morning court price
- [x] Homepage price block shows exact court prices only (no coaching price ranges)

### Instructor Model Correction (2026-02-24)

- [x] Trainers have one price per hour (no time-tier trainer prices)
- [x] Trainers can be linked to multiple sports
- [x] Admin trainers page supports editing description, sports, and price
- [x] Admin trainer management shows trainer session history
- [x] Coaches page uses DB trainer description + multi-sport labels + single trainer price

---

## Executive Summary

The codebase has **solid backend foundations** (DB-backed availability, concurrency guards, pricing engine, auth, admin CRUD) but the **front-end experience is not production-ready**. Key issues:

1. **No mobile navigation** — nav links are hidden below 768px with no hamburger menu
2. **Developer/technical copy leaks into customer UI** — DB references, test credentials on login page, admin-speak in error messages
3. **Design is flat and image-free** — no photos for courts or coaches, no visual richness
4. **Booking flow has UX friction** — auth wall surprises users late, no step indicator, no progressive disclosure
5. **Admin panel is hard to navigate** — no sidebar, no breadcrumbs, no delete confirmations, raw status values
6. **Content pages are thin** — contact info is placeholder, no social links, no map, no working hours on public site

---

## Phase 1: Critical Fixes (Must-Do Before Any Demo)

### 1.1 Remove developer/test content from production UI

**Files**: `app/login/page.tsx`, `app/account/page.tsx`, `src/components/booking/live-booking-form.tsx`

- [x] **Login page**: Remove the `auth-panel__hint` that displays `admin@example.com / Admin123!` credentials. Replace with a simple "Нет аккаунта? Зарегистрироваться" link only.
- [x] **Login page**: Remove the "В админ-панель" link from the public login page. Admin access should not be advertised.
- [x] **Account page**: Rewrite `account-stats__description` — remove "реальные записи из БД" (DB reference). Replace with user-friendly copy: "История ваших бронирований, статусы и возможность отмены."
- [x] **Account page**: Hide or humanize the "Роль: customer" field. Either remove it or display "Тип аккаунта: Клиент".
- [x] **Booking form**: Remove "Проверьте графики тренеров в админке" message from the training empty state. Replace with "Попробуйте другое время или дату."
- [x] **Booking form**: Remove the demo-fallback warning message from booking success state. If demo fallback fires, show a generic error instead.
- [x] **Booking form**: Stop exposing internal court ID in the price summary. Show only the human-readable court name (e.g. "Падел 1", not "padel-1 (padel-1)").

### 1.2 Add mobile navigation

**Files**: `src/components/site-header.tsx`, `app/globals.css`

- [x] Add a hamburger menu button (visible on mobile, hidden on `md:` and up).
- [x] Create a slide-out or dropdown mobile nav drawer containing all 5 nav links + portal link + booking CTA.
- [x] Ensure the drawer closes on navigation (route change) and on outside click.
- [x] Keep the existing desktop nav unchanged.

### 1.3 Fix the homepage booking preview widget

**Files**: `src/components/booking-form-preview.tsx`, `app/globals.css`

**Option A (recommended)**: Remove the fake interactive controls entirely. Replace with a visual/static illustration of the booking steps (numbered steps with icons) that links to `/book`. No form inputs that do nothing.

**Option B**: Convert it to a real quick-search that redirects to `/book?sport=padel&date=2026-02-25` with pre-filled params.

- [x] Implemented **Option A**: replaced fake form controls with a static visual booking-step illustration + CTA link to `/book`.

### 1.4 Fix registration form data loss on error

**Files**: `app/register/page.tsx`

- [x] Convert registration to a client component (or use `useActionState`) so that form field values persist when server-side validation returns errors.
- [x] Show inline field-level validation errors (not just a top-level banner).
- [x] Add phone format hint: "+7 (7XX) XXX-XX-XX".

### Phase 1 Status

- [x] Phase 1 complete (1.1, 1.2, 1.3 Option A, 1.4)

---

## Phase 2: Design & Visual Quality Uplift

### 2.1 Homepage redesign

**Files**: `app/page.tsx`, `app/globals.css`, `src/lib/content/site-content.ts`

- [x] **Hero section**: Add a full-width hero image or gradient background with overlay text. The current hero is a white card on a white background — it has no visual impact.
- [x] **Rewrite stats section**: Replace the weak third stat ("₸ Оплата в тенге") with something meaningful: e.g. "4 тренера", "07:00–23:00 ежедневно", or "Онлайн 24/7".
- [x] **Features section**: Add subtle icons or illustrations to the 3 feature cards (currently text-only cards).
- [x] **Add social proof section**: Even placeholder testimonials or a "Более 500 бронирований" counter add trust.
- [x] **Improve CTA hierarchy**: Make the primary "Забронировать" button larger and more prominent. Consider a sticky bottom CTA on mobile.

### 2.2 Courts page — add visual content and booking links

**Files**: `app/courts/page.tsx`, `app/globals.css`, `src/lib/content/site-content.ts`

- [x] Add placeholder court images (or an image placeholder component with a sport icon). Courts pages without photos feel empty.
- [x] Add a "Забронировать" button on each court card linking to `/book?sport=padel` or `/book?sport=squash`.
- [x] Add capacity info to court descriptions (e.g. "Макс. 4 игрока" for padel, "1–2 игрока" for squash).
- [x] Add a link to the prices page from this page.

### 2.3 Coaches page — add photos and booking links

**Files**: `app/coaches/page.tsx`, `app/globals.css`, `src/lib/content/site-content.ts`

- [x] Add placeholder coach avatars (initials-based avatar component or placeholder images).
- [x] Add each coach's price range (from the pricing data) — "от X ₸/час".
- [x] Add a "Записаться" button on each coach card linking to `/book?service=training&sport=padel`.
- [x] Improve card layout: sport badge, photo/avatar, name, experience badge, bio text, formats as tags, price, CTA button.

### 2.4 Contact page — make it real

**Files**: `app/contact/page.tsx`, `src/lib/content/site-content.ts`

- [x] Replace placeholder phone `+7 (700) 000-00-00` with a real or clearly-marked-as-demo number.
- [x] Add working hours to the contact page (pulled from the DB opening hours, or from site-content).
- [x] Add a map embed or Google Maps link for the address.
- [x] Add social media links (Instagram, WhatsApp at minimum — critical for KZ market).
- [x] Add a simple contact form (name, phone, message) with server action.

### 2.5 Prices page — add worked example and CTA

**Files**: `app/prices/page.tsx`, `src/lib/content/site-content.ts`

- [x] Add a "Пример расчёта" section showing a concrete price breakdown: "Тренировка по паделу, вечер: корт 8 000 ₸ + тренер 5 000 ₸ = 13 000 ₸".
- [x] Add a "Забронировать" CTA button at the bottom of the page.
- [x] Consider adding trainer-specific prices (or a range) in the pricing table.

### 2.6 Global design improvements

**Files**: `app/globals.css`, `app/layout.tsx`

- [x] **Typography scale**: Increase body text line-height slightly for better readability of Russian text (longer words).
- [x] **Card hover states**: Add subtle hover effects (shadow lift, border color change) to interactive cards across the site.
- [x] **Button loading states**: Add a spinner/disabled state to all form submit buttons (login, register, booking, admin forms).
- [x] **Footer**: Add social media icons, copyright line, and legal links placeholder (Политика конфиденциальности, Условия использования).
- [x] **Favicon**: Ensure a proper favicon is set (not the Next.js default).

---

## Phase 3: Booking Flow UX Overhaul

> **Major flow change**: Trainer selection moves BEFORE time selection for training bookings.
> This means the availability API is called with an instructor filter, and slots shown are only
> those where both a court AND the selected trainer are free. Users can also select multiple
> sessions (time slots) in a single booking for both court rental and training.

### 3.0 New booking flow (step order)

**Current flow**: Sport → Service → Date+Court+Time → Trainer → Account → Submit

**New flow**:

| Step | Court rental | Training |
|------|-------------|----------|
| 1 | Select sport | Select sport |
| 2 | Select service type (court) | Select service type (training) |
| 3 | Select date | Select trainer |
| 4 | Select one or more timeslots (court auto-assigned) | Select date |
| 5 | Account/auth | Select one or more timeslots (court auto-assigned, filtered by trainer availability) |
| 6 | Review & submit | Account/auth |
| 7 | — | Review & submit |

Key changes:
- **Trainer before timeslots**: For training, the user picks a trainer first. Then the availability API is called filtered by that trainer, so only slots where both a court and the trainer are free are shown.
- **Multi-slot selection**: Users can select multiple time slots in one booking (e.g. 09:00, 10:00, 14:00 on the same date). Each slot becomes a separate booking record on submit, but the UI groups them as one action.
- **Court auto-assignment**: The user no longer picks a specific court. Slots are shown as time buttons only (e.g. "09:00–10:00"). The system assigns an available court automatically. This simplifies the UI from a "per-court slot grid" to a flat list of available times.
- **Progressive disclosure**: Only the current step and completed steps are visible. Future steps are collapsed.

### 3.1 Rewrite booking form step structure + progressive disclosure

**Files**: `src/components/booking/live-booking-form.tsx`, `app/globals.css`

- [x] **Restructure the form** into the new step order described above.
- [x] **Progressive disclosure**: Only show the current step and completed steps. Future steps are collapsed/hidden. Completed steps show a summary (e.g. "Падел / Тренировка / Илья Смирнов") with an "Изменить" (edit) button to go back.
- [x] **Add a visual step indicator** at the top: horizontal stepper showing step numbers with current/completed/pending states. Number of steps differs for court (5) vs training (6).
- [x] **Animate step transitions**: Smooth reveal when a selection is made (CSS transition on max-height or similar).

### 3.2 Trainer selection step (before date/time for training)

**Files**: `src/components/booking/live-booking-form.tsx`

- [x] After selecting "Тренировка", show trainer cards for the selected sport (from `instructors` prop, filtered by `sports.includes(sport)`).
- [x] Each trainer card shows: name, initials avatar, price per hour, sport tags.
- [x] Selecting a trainer stores `selectedInstructorId` and advances to the date step.
- [x] The subsequent availability fetch includes `instructorId` as a query param so the API returns only slots where the trainer is free.

### 3.3 Availability API — add instructor filter

**Files**: `app/api/availability/route.ts`, `src/lib/availability/db.ts`, `src/lib/availability/engine.ts`, `src/lib/validation/booking.ts`

- [x] Add optional `instructorId` query param to `GET /api/availability`.
- [x] When `instructorId` is provided, filter generated slots to only include times where the specified instructor is available (schedule match + no booking conflict + no exception).
- [x] The slot response no longer needs `availableInstructorIds` per slot when `instructorId` is provided — the trainer is already chosen.

### 3.4 Multi-slot selection

**Files**: `src/components/booking/live-booking-form.tsx`, `app/globals.css`

- [x] Replace `selectedSlotKey: string` with `selectedSlotKeys: string[]` (array of slot keys).
- [x] Slot buttons toggle selection on click (click once to add, click again to remove).
- [x] Show a selection counter: "Выбрано: 3 слота".
- [x] Price preview updates to show per-slot price × number of slots = total.
- [x] The submit action loops over selected slots and creates one booking per slot (POST to `/api/bookings` per slot, or a batch endpoint if needed).
- [x] On partial failure (some slots succeed, some conflict), show clear feedback: "2 из 3 бронирований созданы. Слот 14:00 уже занят."

### 3.5 Court auto-assignment (simplify slot display)

**Files**: `src/components/booking/live-booking-form.tsx`

- [x] Instead of grouping slots by court, show a flat list of unique time slots (e.g. "09:00", "10:00", "11:00").
- [x] If multiple courts are free at the same time, show the time once (not duplicated per court).
- [x] On submit, the system picks an available court automatically (first available from `slot.availableCourtIds`).
- [x] The confirmation shows which court was assigned (but the user doesn't choose it).

### 3.6 Surface auth requirement early

**Files**: `src/components/booking/live-booking-form.tsx`

- [x] Add a **persistent info banner** at the top of the booking form for unauthenticated users: "Для бронирования необходим аккаунт. [Войти] / [Зарегистрироваться]" — visible from step 1.
- [x] Persist selected sport/service/trainer/date in URL query params (`/book?sport=padel&service=training&instructor=abc&date=2026-02-25`) so that after login/register redirect, the user returns to the same state.
- [x] Read URL query params on mount and auto-restore selections.

### 3.7 Booking confirmation improvements

**Files**: `src/components/booking/live-booking-form.tsx`

- [x] After successful booking(s), show a clear confirmation card with:
  - List of booked sessions (date, time, court name assigned, trainer if applicable)
  - Total price across all sessions
  - What happens next: "Бронирование подтверждено. Детали доступны в личном кабинете."
  - Direct link to `/account/bookings`
- [x] Remove raw booking UUID from the primary view. Show as a small reference number if needed.
- [x] Remove raw payment status/provider strings. Show human-readable confirmation status only.

### 3.8 Slot display improvements

**Files**: `src/components/booking/live-booking-form.tsx`, `app/globals.css`

- [x] Add loading skeleton UI while slots are fetching (instead of plain text "Загружаем доступное время...").
- [x] Show the pricing tier label on each slot button (e.g. small tag "утро" / "вечер") so users understand why prices differ.
- [x] Visually distinguish selected slots (filled accent color) from available (outline) and unavailable (greyed out).
- [x] Show the per-slot price on or near each time button.

---

## Phase 4: Login / Registration / Auth Flow

### 4.1 Login page cleanup

**Files**: `app/login/page.tsx`, `app/globals.css`

- [x] Remove test credentials hint (covered in Phase 1).
- [x] Add loading state to the submit button.
- [x] Add "Забыли пароль?" link (even if it links to a "Свяжитесь с администратором" page for now).
- [x] Improve the visual design of the auth panel: add the club logo/brand mark, warmer card styling.

### 4.2 Registration page improvements

**Files**: `app/register/page.tsx`

- [x] Preserve form values on validation error (covered in Phase 1).
- [x] Add inline validation feedback (email format, password length, phone format).
- [x] Add password visibility toggle.
- [x] After successful registration, redirect to the page the user came from (e.g. `/book`) rather than always to `/account`.

### 4.3 Account pages improvements

**Files**: `app/account/page.tsx`, `app/account/bookings/page.tsx`, `app/globals.css`

- [x] Add a **tab navigation** between Account sections: "Профиль" / "Мои бронирования" (visible on both pages).
- [x] Add profile editing capability (name, phone) directly on the account page.
- [x] On the bookings page:
  - Add visual status badges with colors (confirmed = green, cancelled = red, pending = yellow).
  - Add a cancellation confirmation dialog before cancelling.
  - Show "upcoming" and "past" bookings in separate sections.
  - Improve the responsive design of the bookings table (card layout on mobile instead of table).

---

## Phase 5: Admin Panel UX Overhaul

### 5.1 Admin navigation — add sidebar

**Files**: `app/admin/layout.tsx`, `app/globals.css`

- [ ] Replace the current minimal toolbar with a **persistent sidebar navigation** listing all admin sections:
- [x] Replace the current minimal toolbar with a **persistent sidebar navigation** listing all admin sections:
  - Бронирования
  - Корты
  - Тренеры
  - Услуги
  - Часы работы
  - Цены (матрица)
  - Исключения
- [x] Make the sidebar collapsible on mobile (hamburger toggle).
- [x] Add breadcrumb navigation for nested pages (`Тренеры > Илья Смирнов > Расписание`).

### 5.2 Admin bookings page improvements

**Files**: `app/admin/bookings/page.tsx`, `app/globals.css`

- [x] **Humanize status values**: Replace raw "pending_payment" with "Ожидает оплаты", "confirmed" → "Подтверждено", etc.
- [x] Add **filters**: by status, by date range, by sport, by customer.
- [x] Add **pagination** (current limit is 100 records with no next page).
- [x] Add **search** by customer name/email.
- [x] Show booking details in an expandable row or slide-out panel (court, trainer, price breakdown, customer info).

### 5.3 Admin resource pages improvements

**Files**: `app/admin/courts/page.tsx`, `app/admin/instructors/page.tsx`, `app/admin/services/page.tsx`

- [x] **Add delete confirmation dialogs** for all destructive actions. Currently one click deletes immediately.
- [x] **Separate the create form** from the data table. Move it to a clearly distinguished section above or below the table (or a modal).
- [x] **Add inline editing** for courts (name, notes) and services (name, code) — currently only instructor prices can be edited inline.
- [x] **Add visual active/inactive indicators** (colored dot or badge instead of just text "true"/"false" or a checkbox).

### 5.4 Admin dashboard (index page)

**Files**: `app/admin/page.tsx`

- [x] Add **summary statistics** to the admin index: today's bookings count, pending payments count, active courts/instructors, revenue this week.
- [x] Add **quick actions**: link to most recent bookings, upcoming schedule overview.
- [x] Show **alerts**: e.g. "3 бронирования ожидают оплаты", "Завтра нет доступных тренеров по паделу".

---

## Phase 6: Content & Copy Quality

### 6.1 Rewrite all customer-facing copy

**Files**: `src/lib/content/site-content.ts`

The current content is factually correct but reads like a feature specification, not marketing copy. It needs to feel warmer, more inviting, and speak to the player — not describe the system.

- [x] **Homepage hero**: More emotional hook. Instead of "Бронируйте корты и тренировки онлайн, выбирайте удобный час и тренера" → something like "Падел и сквош для всех уровней. Забронируйте корт за 2 минуты."
- [x] **Homepage lead**: Shorten and punch up. Current lead reads like a bullet list in prose form.
- [x] **Feature cards**: Less system-description, more benefit-driven. "Выбор времени за пару минут" is good. "Понятные правила бронирования" is system-speak — reframe as player benefit. (Applied to the current homepage info/FAQ/rules blocks after the feature-card section was removed earlier.)
- [x] **Booking page notices**: Rewrite in a friendlier, less rule-heavy tone.
- [x] **Coach bios**: These are actually decent. Keep but consider adding a personal touch ("Любимый удар: банджа по стеклу" etc.). (Kept current bios; coach-page hero/fallback copy updated.)

### 6.2 Add missing informational content

**Files**: `src/lib/content/site-content.ts`, potentially new page files

- [x] **FAQ section** (either as a page or as a section on the homepage):
  - "Нужна ли мне своя ракетка?" → "Нет, ракетки можно взять в клубе."
  - "Сколько человек на корте?" → "Падел: 2–4, Сквош: 1–2."
  - "Как отменить бронирование?" → "В личном кабинете, не позднее 6 часов до начала."
- [x] **"How to get here"** section on the contact page with directions (метро, парковка).
- [x] **Club rules / Dress code** — brief section somewhere (shoes required, etc.).

---

## Phase 7: Technical Polish & Missing Features

### 7.1 Password reset flow

**Files**: new pages/actions

- [x] Add `/forgot-password` page with email input.
- [x] For MVP: show "Свяжитесь с администратором: [phone/email]" after submit.
- [ ] For full implementation: email-based reset token flow.

### 7.2 Booking state persistence across auth

**Files**: `src/components/booking/live-booking-form.tsx`, `app/login/page.tsx`, `app/register/page.tsx`

- [x] When an unauthenticated user clicks "Войти" from the booking form, encode current booking selections into a `returnTo` URL with query params.
- [x] After login/register, redirect back to `/book?sport=padel&service=court&date=2026-02-25&time=10:00` and auto-restore selections.

### 7.3 SEO & metadata

**Files**: `app/layout.tsx`, all page files

- [x] Add Open Graph metadata (title, description, image) to layout and key pages.
- [x] Add structured data (JSON-LD) for the sports facility (LocalBusiness schema).
- [x] Ensure all pages have unique `<title>` and `<meta description>`.

### 7.4 Accessibility audit

**Files**: various

- [x] Add skip-to-content link in the layout.
- [x] Ensure all interactive elements are keyboard-navigable.
- [x] Add `aria-label` to icon-only buttons (hamburger menu, close buttons).
- [ ] Ensure color contrast meets WCAG AA on all text/background combinations.

---

## Implementation Priority Order

| Priority | Phase | Effort | Impact |
|----------|-------|--------|--------|
| 1 | Phase 2.5 (Review fixes — cleanup Phase 1/2 bugs) | Small | High — removes broken links, leaked copy, orphaned code |
| 2 | Phase 3 (Booking flow overhaul — new step order + multi-slot + auto-court) | Large | High — core conversion flow, major UX improvement |
| 3 | Phase 4 (Auth flow improvements) | Medium | Medium — reduces drop-off |
| 4 | Phase 5.1 (Admin sidebar + nav) | Medium | High — admin usability |
| 5 | Phase 6 (Content & copy quality) | Small | Medium — tone and trust |
| 6 | Phase 5.2–5.4 (Admin improvements) | Large | Medium — admin quality of life |
| 7 | Phase 7 (Technical polish) | Medium | Low–Med — nice-to-haves |

---

## Phase 1 & 2 Review Notes (Issues Found)

> These are bugs and incomplete items from the Phase 1/2 implementation that should be fixed
> before moving to Phase 3. Can be done as a quick "Phase 2.5" cleanup pass.

### Critical

- [x] **Dead legal links**: Footer links to `/legal/privacy` and `/legal/terms` are 404s. The `app/legal/` directory doesn't exist. Either create stub pages or remove the links until content is ready.

### Admin-speak still leaking to public users

- [x] **Account bookings hero** (`app/account/bookings/page.tsx` line ~69): Description says "Список ваших бронирований из БД." — remove "из БД".
- [x] **Homepage aboutClubDescription** (`site-content.ts`): "Список и состояние кортов берутся из базы данных и управляются через админ-панель." — rewrite to user-facing copy.
- [x] **Homepage pricingSubtitle** (`site-content.ts`): "Цены берутся из настроек клуба в админ-панели." — rewrite.
- [x] **Coaches empty state** (`app/coaches/page.tsx`): "Добавьте тренеров в админ-панели." shown to public users. Replace with "Информация о тренерах скоро появится."
- [x] **Footer copyright** (`site-footer.tsx`): "Демо-версия публичного сайта." — remove or replace with standard copyright.
- [x] **Login page description**: Still mentions "Админ-раздел доступен только пользователям с ролью admin." — this is admin framing on a public page.
- [x] **Login default redirect**: `app/login/page.tsx` defaults `next` to `/admin` instead of `/account`. Regular customers without a `?next=` param get directed to admin after login.

### Incomplete or orphaned implementations

- [x] **BookingFormPreview** component exists but is not used anywhere. Either delete it or use it.
- [x] **featureItems** in `site-content.ts` (with icon numbers) and `.feature-grid__*` CSS are defined but not rendered on the homepage.
- [x] **Social proof CSS** (`.social-proof__*`) fully defined in globals.css but unused.
- [x] **`coachItems`** static array in `site-content.ts` is orphaned — coaches page pulls from DB now.
- [x] **`ContactForm`** component (`src/components/contact/contact-form.tsx`) was built but is orphaned — contact form was intentionally removed per user decision. Delete the component.
- [x] **Homepage has 3 placeholder sections** exposed to public: FAQ ("добавим позже"), Правила бронирования ("добавим позже"), Правила клуба ("добавим позже"). Either fill with real content or remove these sections until content is ready.

### CSS / styling bugs

- [x] **Transition conflict**: Several card classes use `transition-transform transition-colors` which may conflict in Tailwind v4 (both set `transition` property). Should use `transition-all` or a combined transition.
- [x] **Spinner on all disabled buttons**: The `::before` spinner animation shows on ALL disabled buttons, not just during loading/pending. A submit button disabled because a required field is empty shows a spinner. The spinner should only appear when `isPending`/`submitLoading` is true (use a `--loading` BEM modifier class).
- [x] **Prices page wrong class**: `app/prices/page.tsx` uses `className="home-page__primary-button"` — a homepage-scoped class on the Prices page. Works but semantically wrong and fragile.

### Data edge cases

- [x] **Prices page shows "0 ₸"**: When no instructors exist in DB, the example section shows "Тренер (падел), вечер: 0 ₸" and trainer ranges show "от 0 ₸ до 0 ₸". Should either hide the example or show "Цены тренеров уточняйте при бронировании."

### Booking form issues (will be addressed by Phase 3 rewrite)

- [x] **Success view exposes raw data**: Booking ID (UUID), payment provider name, and raw payment status are shown to users. Will be fixed in Phase 3.7.
- [x] **Phone number demo suffix**: `siteConfig.phone` = `"+7 (727) 355-77-00 (демо)"` — "(демо)" visible on contact page and footer.

---

## Notes for Agent Execution

- **Phase 2.5 (review fixes)** should be done first — it's a quick cleanup pass.
- **Phase 3 (booking overhaul)** is the largest phase and touches both frontend AND backend (API changes for instructor filter).
- Each other phase is independently executable.
- All changes must keep: BEM class naming, `@apply` in CSS only, Russian-only UI, existing test coverage passing.
- After each phase: run `npm run lint && npm run build` to verify.
- After phases that touch booking flow: run `npm run test:e2e` to verify.
- Phase 3 requires updating e2e tests since the booking flow step order changes significantly.
