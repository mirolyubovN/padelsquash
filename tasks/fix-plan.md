# Fix Plan: Make the App Actually Usable

> Analysis + step-by-step plan based on full codebase review and reference site analysis (bookingcourts.ru, padel74.ru).

---

## Part 0: Analysis of What's Wrong

### 0.1 Booking Flow — Critical Problems

**Past dates are selectable.**
`getTodayDate()` only sets the initial `date` state. The date `<input>` has no `min` attribute, so the user can freely navigate to yesterday and book it.

**7-step wizard is too complex.**
The current stepper shows: Location → Sport → Service → Trainer → Date → Time → Account → Confirm.
That is 7–8 steps. bookingcourts.ru needs 3 clicks. The "Service" step (аренда vs тренировка) is a full wizard step for what should be a toggle. The "Account" step is redundant when the user is already logged in.

**"Sport" and "Service" are two separate steps that feel the same.**
Users don't think in terms of "Service objects". They think: I want to play padel → I want to rent a court / I want to train. This should be: sport tab + a toggle, not two sequential steps.

**Time selection is decoupled from date.**
The form shows a date input, then fetches slots, then shows them below. Reference sites (bookingcourts.ru) show a calendar-style date picker next to the slot grid — both visible at once. Separating them adds unnecessary steps.

**Court auto-assignment is invisible and confusing.**
"Корт назначается автоматически" is mentioned only in a summary line. Users who try to book specific courts (common in padel clubs where courts differ) are confused by this.

**Multi-slot selection is non-obvious.**
You have to click individual time slots to select them — no instruction that you can select multiple. The visual difference between selected/unselected slots needs to be much stronger.

**Customer info editor in the booking form.**
When the user is already authenticated, the form re-shows their name/email/phone with an "Изменить" button. This adds cognitive load. If they're logged in, use their profile silently.

**The URL sync logic (pendingTrainerIdFromUrlRef, pendingSlotTimesFromUrlRef) is extremely complex.**
~200 lines of useEffect hooks coordinating URL params → state restoration. This is fragile and error-prone. The cross-auth redirect flow adds mental overhead for a feature users rarely need.

### 0.2 Admin Panel — Critical Problems

**Duplicate link grid on the dashboard.**
`app/admin/page.tsx` has a "Быстрые действия" section (4 links) AND then immediately below it the full `admin-link-grid` with ALL 9+ nav items. This is duplicated navigation that makes the dashboard look broken/unfinished.

**No manual booking creation.**
There is no "Создать бронирование" button anywhere in the admin. This is a dealbreaker for walk-in customers and phone bookings.

**No calendar/day view.**
Admins can only see a paginated table of bookings. There is no visual "what does today look like" view. This is the #1 missing operational tool for any sports facility.

**10 nav items with unclear hierarchy.**
The sidebar has: Панель, Бронирования, Корты, Виды спорта, Тренеры, Услуги, Часы работы, Цены (матрица), Периоды цен, Исключения. That's 10 items, several of which could be grouped or hidden from daily use.

**Bookings table has 3 action buttons on every row, regardless of status.**
"Отмена", "Завершено", "No show" appear on every booking row including completed and cancelled ones. Clicking "Отмена" on an already-cancelled booking throws an error.

**No past-date protection in manual booking (when it's built).**
Must be enforced from the start.

**`admin-table` is dense and barely readable on mobile.**
7–8 columns in a small table. Details are hidden in `<details>` toggles, which is functional but inelegant.

### 0.3 Design — Problems

**Homepage is text-heavy with empty placeholder images.**
The gallery divs (`home-overview__gallery-photo`) render as empty gray boxes. The hero uses `home-overview__hero-photo` which is also a blank div. The site looks unfinished.

**No visual hierarchy.**
All sections have similar weight. The "hero" doesn't feel like a hero — the booking CTA competes equally with FAQ cards, rules, about section.

**The booking page starts with a tall PageHero before the form.**
Users have to scroll before seeing what they came to do (book something). The hero on the booking page should be removed or compressed to a one-liner.

**Color system is muted/undefined.**
padel74.ru uses bold #4E6BF2 blue for all CTAs and active states, with near-black for sections. Our current CSS doesn't have a clear primary color applied boldly.

**Social links use 2-letter abbreviations ("IG", "TG", "WA") instead of icons.**
These look like placeholders, not intentional design.

---

## Part 1: Step-by-Step Fix Plan

### STEP 1 — Fix Critical Bugs (1 session, low risk)

These are quick targeted fixes with no architectural changes.

#### 1.1 Prevent past date selection in booking form

**File:** `src/components/booking/live-booking-form.tsx`

Find the date `<input>` element and add `min={getTodayDate()}`:
```tsx
<input
  type="date"
  min={getTodayDate()}
  value={date}
  onChange={(e) => setDate(e.target.value)}
/>
```
Also add a guard in state: if a URL param tries to restore a past date, ignore it — clamp to today.

#### 1.2 Remove duplicate link grid from admin dashboard

**File:** `app/admin/page.tsx`

Delete the entire final `<div className="admin-link-grid">` block (lines 109–115). The sidebar already provides navigation to all these pages. Keep only the "Быстрые действия" quick links panel (which should be trimmed to 2–3 most useful actions).

Replace quick actions with:
```tsx
<Link href="/admin/bookings/create">Создать бронирование</Link>
<Link href="/admin/bookings?status=pending_payment">Ожидают оплаты</Link>
<Link href="/admin/exceptions">Добавить исключение</Link>
```

#### 1.3 Show only relevant action buttons per booking status

**File:** `app/admin/bookings/page.tsx`

Change the actions column to show actions only when they make sense:
- `pending_payment` → show "Подтвердить оплату" + "Отменить"
- `confirmed` → show "Завершено" + "No show" + "Отменить"
- `completed`, `no_show`, `cancelled` → show nothing (or a greyed-out "—")

Do NOT show all 4 buttons on every row.

---

### STEP 2 — Rebuild the Booking Form (1–2 sessions, medium complexity)

**Goal:** 3 clear steps. No wizard complexity. Dead simple.

#### The new flow:

```
Step 1: ВЫБЕРИТЕ ЧТО
  - Sport tabs (Падел / Сквош / Теннис...)  ← pill tabs, auto-selected if only 1 sport
  - Type toggle: [Аренда корта] [Тренировка]
  - If "Тренировка": show trainer cards inline (name, price per hour, "Выбрать")

Step 2: ВЫБЕРИТЕ КОГДА
  - Date picker (native date input with min=today, styled clearly)
  - Below/beside: grid of time slots (08:00, 09:00... etc.)
  - Each slot button shows: time + price. If unavailable, disabled.
  - Multiple slots: clear visual "you can select multiple slots" hint
  - Selected slots highlighted in primary blue

Step 3: ПОДТВЕРДЕНИЕ
  - Summary: Sport · Date · Time slots · Trainer (if any) · Total price
  - If NOT authenticated:
    - Big card: "Войдите или зарегистрируйтесь чтобы завершить бронирование"
    - [Войти] [Зарегистрироваться] buttons
    - Booking state saved in URL params for redirect back
  - If authenticated:
    - Show profile name + phone (from session, read-only)
    - [ЗАБРОНИРОВАТЬ] primary button
```

#### Implementation details:

**File:** `src/components/booking/live-booking-form.tsx` — major rewrite.

- Remove the stepper `<ol>` (7 items is too many, confusing)
- Remove `editingStepId`, `collapseCompletedSteps` progressive disclosure logic — show all 3 sections on one scrollable page
- Remove `showCustomerEditor`, `customerEditorName`, `customerEditorEmail`, etc. (authenticated users don't need to re-enter info)
- Simplify URL sync: only sync `sport`, `service`, `date`, `instructor` — drop the `time` restoration (too complex for minimal gain)
- Add `min={getTodayDate()}` to date input
- Replace the current `booking-live__choice-list` for service with a segmented toggle (Аренда / Тренировка)
- Time slot grid: `display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr))` — 4–5 columns on desktop, 3 on mobile
- Selected slots: strong blue background, white text. Unselected: white with border. Disabled: gray, cursor-not-allowed.
- Multi-select hint: "Можно выбрать несколько слотов подряд" as a small note above the grid

**File:** `app/book/page.tsx`
- Remove `<PageHero>` — replace with a compact 2-line header or nothing (let the form speak for itself)
- Remove the bottom "Важно знать" section (move it to a `<details>` toggle if needed)

**File:** `app/globals.css`
- Add slot grid styles
- Add segmented toggle styles (Аренда/Тренировка)
- Ensure strong selected state on slots

---

### STEP 3 — Admin Manual Booking Creation (1 session)

**New file:** `app/admin/bookings/create/page.tsx`

Simple form, server component wrapper + server action:

```
Fields:
1. Дата (date picker, min=today)
2. Спорт (select from DB sports)
3. Тип (Аренда корта / Тренировка)
4. Если тренировка: выберите тренера (select)
5. Временной слот (fetched from availability API based on date+sport+service)
   — rendered as a list of radio buttons (pick one slot per manual booking)
6. Клиент: поиск по имени/email/телефону из базы
   — if not found: mini form (name, email, phone)
7. Оплата: [Оплачено (наличные)] [Ожидает оплаты] [Бесплатно]
8. Примечание (optional textarea)
[СОЗДАТЬ БРОНИРОВАНИЕ] button
```

**Add to sidebar nav:** `{ href: "/admin/bookings/create", label: "Создать бронирование" }` at top of list.

**Add to admin bookings page header:** A link/button to `/admin/bookings/create`.

**Server action** reuses `createBooking` logic from `src/lib/bookings/persistence.ts` with `skipAuthCheck: true` and adds a note "Создано администратором".

---

### STEP 4 — Admin Calendar Day View (1–2 sessions)

**New file:** `app/admin/calendar/page.tsx`

This is the most important operational admin tool.

**Layout:**
```
[← Назад] [Сегодня] [Вперед →]   [дата]

         | Корт 1 (Падел) | Корт 2 (Падел) | Корт 1 (Сквош) |
  08:00  |    СВОБОДНО    |    СВОБОДНО    |    СВОБОДНО    |
  09:00  |   Иван Петров  |    СВОБОДНО    |   Анна Ким     |
  09:00  |  Аренда · 8000 |                | Тренировка     |
  10:00  |    ЗАБЛОК.     |    ЗАБЛОК.     |    СВОБОДНО    |
  ...
```

- Rows: time slots (08:00 to 22:00, 1 hour each)
- Columns: one per active court, grouped by sport
- Cells:
  - **Booked**: customer name + service type + price (if super_admin). Color: green (confirmed), yellow (pending), gray (cancelled)
  - **Blocked**: exception label. Color: striped gray
  - **Free**: clickable → redirect to `/admin/bookings/create?date=...&court=...&time=...`

**Server component** fetches:
- `prisma.booking.findMany({ where: { locationId, startAt between day start and end }, include: { customer, service, resources } })`
- `prisma.scheduleException.findMany({ where: { locationId, date: day } })`
- `prisma.court.findMany({ where: { locationId, active: true } })`
- `prisma.openingHour.findFirst({ where: { locationId, dayOfWeek: day.getDay() } })`

**Navigation:** `/admin/calendar?date=2026-03-05` — date in URL query param.

**Add to sidebar nav** as first item: `{ href: "/admin/calendar", label: "Расписание" }`.

---

### STEP 5 — Admin Navigation Simplification

**File:** `src/components/admin/admin-nav-config.ts`

New nav structure (7 items instead of 10):

```typescript
const ALL_ADMIN_NAV_ITEMS = [
  { href: "/admin/calendar", label: "Расписание" },          // NEW — most important
  { href: "/admin/bookings", label: "Бронирования" },
  { href: "/admin/bookings/create", label: "Создать бронь" }, // NEW
  { href: "/admin/instructors", label: "Тренеры" },
  { href: "/admin/courts", label: "Корты" },
  { href: "/admin/exceptions", label: "Исключения" },
  { href: "/admin", label: "Дашборд" },
  // Pricing-sensitive (super_admin only):
  { href: "/admin/pricing/base", label: "Цены", pricingSensitive: true },
  { href: "/admin/opening-hours", label: "Часы работы", pricingSensitive: true },
  { href: "/admin/sports", label: "Виды спорта", pricingSensitive: true },
  { href: "/admin/services", label: "Услуги", pricingSensitive: true },
];
```

Remove from standard nav:
- `/admin/pricing/rules` (combine into the base pricing page or hide)
- Move opening-hours and sports/services to pricing-sensitive (they don't change daily)

---

### STEP 6 — Design System Overhaul

Do NOT change any BEM class names. Change only the CSS definitions.

**File:** `app/globals.css`

#### 6.1 Color variables

```css
:root {
  --color-primary: #2563eb;        /* vibrant blue — all CTAs */
  --color-primary-dark: #1d4ed8;   /* hover state */
  --color-primary-light: #dbeafe;  /* selected slot background */
  --color-dark: #111827;           /* hero, dark sections */
  --color-dark-text: #ffffff;      /* text on dark sections */
  --color-surface: #ffffff;        /* card backgrounds */
  --color-bg: #f9fafb;             /* page background */
  --color-border: #e5e7eb;         /* subtle borders */
  --color-text: #111827;           /* body text */
  --color-text-muted: #6b7280;     /* secondary text */
  --color-success: #16a34a;
  --color-warning: #d97706;
  --color-danger: #dc2626;
}
```

#### 6.2 Typography

```css
h1 { font-size: clamp(2rem, 5vw, 4rem); font-weight: 900; letter-spacing: -0.02em; }
h2 { font-size: clamp(1.5rem, 3vw, 2.25rem); font-weight: 800; }
h3 { font-size: 1.25rem; font-weight: 700; }
```

#### 6.3 Hero section

```css
.home-overview__hero {
  background: var(--color-dark);
  min-height: 80vh;
  display: flex;
  align-items: center;
}
.home-overview__title {
  font-size: clamp(2.5rem, 6vw, 5rem);
  font-weight: 900;
  text-transform: uppercase;
  color: #fff;
  letter-spacing: -0.02em;
}
.home-overview__hero-cta {
  background: var(--color-primary);
  color: #fff;
  font-size: 1.125rem;
  font-weight: 700;
  padding: 1rem 2.5rem;
  border-radius: 0.5rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
```

#### 6.4 Primary buttons (booking CTA, submit button)

All `.booking-live__submit`, `.home-overview__hero-cta`, `.admin-form__submit` style buttons:
```css
background: var(--color-primary);
color: #fff;
font-weight: 700;
padding: 0.875rem 2rem;
border-radius: 0.5rem;
font-size: 1rem;
letter-spacing: 0.025em;
cursor: pointer;
transition: background 0.15s;

&:hover { background: var(--color-primary-dark); }
```

#### 6.5 Time slot buttons

```css
.booking-live__slot {
  border: 2px solid var(--color-border);
  border-radius: 0.5rem;
  padding: 0.75rem;
  text-align: center;
  cursor: pointer;
  background: var(--color-surface);
  transition: all 0.15s;
  font-weight: 600;
}
.booking-live__slot--selected {
  border-color: var(--color-primary);
  background: var(--color-primary);
  color: #fff;
}
.booking-live__slot--disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
```

#### 6.6 Admin — clean up dense table

```css
.admin-table__cell {
  padding: 0.75rem 1rem;  /* increase from current cramped padding */
  vertical-align: middle;
  border-bottom: 1px solid var(--color-border);
}
/* Action buttons: use icon-like small buttons */
.admin-bookings__action-button {
  font-size: 0.75rem;
  padding: 0.25rem 0.625rem;
  border-radius: 0.25rem;
  border: 1px solid var(--color-border);
}
```

#### 6.7 Homepage — simplify sections

Remove or merge sections. The homepage currently has 6+ sections (hero, pricing, equipment banner, FAQ, rules, about, socials). Reduce to:
1. **Hero** (dark, full-viewport, headline + CTA)
2. **Sports** (2–3 cards: Падел / Сквош with court count + "от X тенге/час")
3. **Prices** (simple table: morning/day/evening for each sport)
4. **Coaches** (if any active instructors)
5. **Contact** (address, phone, social links)

Merge FAQ and Rules into one collapsible accordion section.
Remove the empty `home-overview__gallery-photo` divs (they are blank gray boxes).

---

### STEP 7 — Booking Page Layout Fix

**File:** `app/book/page.tsx`
- Remove `<PageHero>` component entirely. Replace with a compact `<h1>Бронирование</h1>` inside the booking form itself.
- Remove the "Важно знать" section at the bottom (or make it a collapsed `<details>` initially).

**File:** `src/components/booking/live-booking-form.tsx`
- Start the form with the heading directly: `<h1 className="booking-flow__title">Забронировать</h1>`
- The form should be the first thing on the page, visible without scrolling.

---

## Priority Order for Execution

| # | Step | Files | Effort | Impact |
|---|------|-------|--------|--------|
| 1 | 1.1 — Past date bug | live-booking-form.tsx | 5 min | Critical |
| 2 | 1.2 — Duplicate link grid | admin/page.tsx | 5 min | High |
| 3 | 1.3 — Action buttons per status | admin/bookings/page.tsx | 15 min | High |
| 4 | 3 — Manual booking creation | admin/bookings/create/page.tsx | 4–6 hours | Critical |
| 5 | 4 — Admin calendar view | admin/calendar/page.tsx | 6–8 hours | Critical |
| 6 | 2 — Booking form rebuild | live-booking-form.tsx | 4–6 hours | Critical |
| 7 | 5 — Nav simplification | admin-nav-config.ts | 30 min | High |
| 8 | 6 — Design system | globals.css | 3–4 hours | High |
| 9 | 7 — Booking page layout | book/page.tsx | 30 min | Medium |

---

## What NOT to do

- Do NOT add more features before fixing the above usability problems.
- Do NOT add i18n, notifications, waitlists, or recurring bookings until the basic UX works.
- Do NOT change the schema again — it's stable now (Location + Sport tables done).
- Do NOT add a complex drag-and-drop calendar — a simple time grid with colored cells is enough.
- Do NOT use any Tailwind utility classes inline in JSX — all styles go in `@apply` blocks in globals.css.
- Do NOT change the BEM class naming convention.
- Do NOT change the database migrations or seed — they're complete.

---

## Constraints to Preserve

- Russian-only UI
- BEM class naming in JSX, `@apply` in CSS only
- Auth required for customer booking
- 60-minute slots only (do not add flexible durations in this pass)
- Court auto-assignment (do not add court picker for customers — too complex)
- NextAuth / Auth.js credentials provider
- PostgreSQL + Prisma
