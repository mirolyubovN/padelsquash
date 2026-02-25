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

### 3.1 Progressive step disclosure

**Files**: `src/components/booking/live-booking-form.tsx`, `app/globals.css`

Current problem: All 5 steps are visible at once regardless of progress. Users see a wall of options.

- [ ] **Implement progressive disclosure**: Only show the current step and completed steps. Future steps should be collapsed/hidden.
- [ ] **Add a visual step indicator** at the top of the form: a horizontal stepper showing steps 1→2→3→(4)→5 with current/completed/pending states.
- [ ] **Animate step transitions**: Smooth reveal of the next step when a selection is made.

### 3.2 Surface auth requirement early

**Files**: `src/components/booking/live-booking-form.tsx`

- [ ] Add a **persistent info banner** at the top of the booking form for unauthenticated users: "Для бронирования необходим аккаунт. [Войти] / [Зарегистрироваться]" — visible from step 1.
- [ ] Make the auth step (step 5) less of a dead-end: consider inline login/register forms within the booking flow instead of links that navigate away (losing all selections).
- [ ] Or: persist selected sport/service/date/slot in URL query params so the user returns to the same state after login.

### 3.3 Booking confirmation improvements

**Files**: `src/components/booking/live-booking-form.tsx`

- [ ] After successful booking, show a clear confirmation card with:
  - Booking summary (sport, service, date, time, court name, trainer if applicable)
  - Total price
  - What happens next (e.g. "Бронирование подтверждено. Детали доступны в личном кабинете.")
  - Direct link to `/account/bookings`
- [ ] Remove the technical booking ID from the confirmation view (or show it as a small reference number, not the primary info).

### 3.4 Slot selection improvements

**Files**: `src/components/booking/live-booking-form.tsx`, `app/globals.css`

- [ ] Add loading skeleton UI while slots are fetching (instead of just "Загрузка...").
- [ ] Show the price directly on each time slot button (or at least indicate the pricing tier: "утро" / "день" / "вечер").
- [ ] Highlight the selected slot more prominently (current selection state may be subtle).

---

## Phase 4: Login / Registration / Auth Flow

### 4.1 Login page cleanup

**Files**: `app/login/page.tsx`, `app/globals.css`

- [ ] Remove test credentials hint (covered in Phase 1).
- [ ] Add loading state to the submit button.
- [ ] Add "Забыли пароль?" link (even if it links to a "Свяжитесь с администратором" page for now).
- [ ] Improve the visual design of the auth panel: add the club logo/brand mark, warmer card styling.

### 4.2 Registration page improvements

**Files**: `app/register/page.tsx`

- [ ] Preserve form values on validation error (covered in Phase 1).
- [ ] Add inline validation feedback (email format, password length, phone format).
- [ ] Add password visibility toggle.
- [ ] After successful registration, redirect to the page the user came from (e.g. `/book`) rather than always to `/account`.

### 4.3 Account pages improvements

**Files**: `app/account/page.tsx`, `app/account/bookings/page.tsx`, `app/globals.css`

- [ ] Add a **tab navigation** between Account sections: "Профиль" / "Мои бронирования" (visible on both pages).
- [ ] Add profile editing capability (name, phone) directly on the account page.
- [ ] On the bookings page:
  - Add visual status badges with colors (confirmed = green, cancelled = red, pending = yellow).
  - Add a cancellation confirmation dialog before cancelling.
  - Show "upcoming" and "past" bookings in separate sections.
  - Improve the responsive design of the bookings table (card layout on mobile instead of table).

---

## Phase 5: Admin Panel UX Overhaul

### 5.1 Admin navigation — add sidebar

**Files**: `app/admin/layout.tsx`, `app/globals.css`

- [ ] Replace the current minimal toolbar with a **persistent sidebar navigation** listing all admin sections:
  - Бронирования
  - Корты
  - Тренеры
  - Услуги
  - Часы работы
  - Цены (матрица)
  - Исключения
- [ ] Make the sidebar collapsible on mobile (hamburger toggle).
- [ ] Add breadcrumb navigation for nested pages (`Тренеры > Илья Смирнов > Расписание`).

### 5.2 Admin bookings page improvements

**Files**: `app/admin/bookings/page.tsx`, `app/globals.css`

- [ ] **Humanize status values**: Replace raw "pending_payment" with "Ожидает оплаты", "confirmed" → "Подтверждено", etc.
- [ ] Add **filters**: by status, by date range, by sport, by customer.
- [ ] Add **pagination** (current limit is 100 records with no next page).
- [ ] Add **search** by customer name/email.
- [ ] Show booking details in an expandable row or slide-out panel (court, trainer, price breakdown, customer info).

### 5.3 Admin resource pages improvements

**Files**: `app/admin/courts/page.tsx`, `app/admin/instructors/page.tsx`, `app/admin/services/page.tsx`

- [ ] **Add delete confirmation dialogs** for all destructive actions. Currently one click deletes immediately.
- [ ] **Separate the create form** from the data table. Move it to a clearly distinguished section above or below the table (or a modal).
- [ ] **Add inline editing** for courts (name, notes) and services (name, code) — currently only instructor prices can be edited inline.
- [ ] **Add visual active/inactive indicators** (colored dot or badge instead of just text "true"/"false" or a checkbox).

### 5.4 Admin dashboard (index page)

**Files**: `app/admin/page.tsx`

- [ ] Add **summary statistics** to the admin index: today's bookings count, pending payments count, active courts/instructors, revenue this week.
- [ ] Add **quick actions**: link to most recent bookings, upcoming schedule overview.
- [ ] Show **alerts**: e.g. "3 бронирования ожидают оплаты", "Завтра нет доступных тренеров по паделу".

---

## Phase 6: Content & Copy Quality

### 6.1 Rewrite all customer-facing copy

**Files**: `src/lib/content/site-content.ts`

The current content is factually correct but reads like a feature specification, not marketing copy. It needs to feel warmer, more inviting, and speak to the player — not describe the system.

- [ ] **Homepage hero**: More emotional hook. Instead of "Бронируйте корты и тренировки онлайн, выбирайте удобный час и тренера" → something like "Падел и сквош для всех уровней. Забронируйте корт за 2 минуты."
- [ ] **Homepage lead**: Shorten and punch up. Current lead reads like a bullet list in prose form.
- [ ] **Feature cards**: Less system-description, more benefit-driven. "Выбор времени за пару минут" is good. "Понятные правила бронирования" is system-speak — reframe as player benefit.
- [ ] **Booking page notices**: Rewrite in a friendlier, less rule-heavy tone.
- [ ] **Coach bios**: These are actually decent. Keep but consider adding a personal touch ("Любимый удар: банджа по стеклу" etc.).

### 6.2 Add missing informational content

**Files**: `src/lib/content/site-content.ts`, potentially new page files

- [ ] **FAQ section** (either as a page or as a section on the homepage):
  - "Нужна ли мне своя ракетка?" → "Нет, ракетки можно взять в клубе."
  - "Сколько человек на корте?" → "Падел: 2–4, Сквош: 1–2."
  - "Как отменить бронирование?" → "В личном кабинете, не позднее 6 часов до начала."
- [ ] **"How to get here"** section on the contact page with directions (метро, парковка).
- [ ] **Club rules / Dress code** — brief section somewhere (shoes required, etc.).

---

## Phase 7: Technical Polish & Missing Features

### 7.1 Password reset flow

**Files**: new pages/actions

- [ ] Add `/forgot-password` page with email input.
- [ ] For MVP: show "Свяжитесь с администратором: [phone/email]" after submit.
- [ ] For full implementation: email-based reset token flow.

### 7.2 Booking state persistence across auth

**Files**: `src/components/booking/live-booking-form.tsx`, `app/login/page.tsx`, `app/register/page.tsx`

- [ ] When an unauthenticated user clicks "Войти" from the booking form, encode current booking selections into a `returnTo` URL with query params.
- [ ] After login/register, redirect back to `/book?sport=padel&service=court&date=2026-02-25&time=10:00` and auto-restore selections.

### 7.3 SEO & metadata

**Files**: `app/layout.tsx`, all page files

- [ ] Add Open Graph metadata (title, description, image) to layout and key pages.
- [ ] Add structured data (JSON-LD) for the sports facility (LocalBusiness schema).
- [ ] Ensure all pages have unique `<title>` and `<meta description>`.

### 7.4 Accessibility audit

**Files**: various

- [ ] Add skip-to-content link in the layout.
- [ ] Ensure all interactive elements are keyboard-navigable.
- [ ] Add `aria-label` to icon-only buttons (hamburger menu, close buttons).
- [ ] Ensure color contrast meets WCAG AA on all text/background combinations.

---

## Implementation Priority Order

| Priority | Phase | Effort | Impact |
|----------|-------|--------|--------|
| 1 | Phase 1 (Critical fixes) | Small | High — removes embarrassment |
| 2 | Phase 3.1–3.2 (Booking step UX) | Medium | High — core conversion flow |
| 3 | Phase 1.2 (Mobile nav) | Small | High — site is broken on mobile |
| 4 | Phase 5.1 (Admin sidebar) | Medium | High — admin usability |
| 5 | Phase 2.1 (Homepage redesign) | Medium | High — first impression |
| 6 | Phase 4 (Auth flow improvements) | Medium | Medium — reduces drop-off |
| 7 | Phase 6.1 (Copy rewrite) | Small | Medium — tone and trust |
| 8 | Phase 2.2–2.5 (Content pages) | Medium | Medium — completeness |
| 9 | Phase 5.2–5.4 (Admin improvements) | Large | Medium — admin quality of life |
| 10 | Phase 7 (Technical polish) | Medium | Low–Med — nice-to-haves |

---

## Notes for Agent Execution

- Each phase is designed to be independently executable.
- Phases 1–3 should be done first as a batch — they fix the worst issues.
- All changes must keep: BEM class naming, `@apply` in CSS only, Russian-only UI, existing test coverage passing.
- After each phase: run `npm run lint && npm run build` to verify.
- After phases that touch booking flow: run `npm run test:e2e` to verify.
- Do not touch the backend/API layer unless explicitly noted — this is a front-end/UX overhaul.
