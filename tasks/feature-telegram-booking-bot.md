# Telegram Booking Bot — Analysis + Implementation Plan

Date: 2026-05-12
Status: spec / planning — ready to implement (all blocker flaws closed, see Review at bottom)

---

## Part 1 — Current Booking System (as built)

### Entry points
- Web UI: `/book` (multi-step, URL-state) → `POST /api/bookings` for single slot,
  `POST /api/bookings/series` for multi-slot, `POST /api/bookings/holds` for
  insufficient-balance resume.
- Admin: `/admin/bookings/create` + `/admin/calendar` deep-link → same persistence
  layer with `paymentMode = wallet | cash | auto`.

### Core modules
- `src/lib/bookings/persistence.ts`
  - `createBookingInDb` — single slot. Validates service/court/instructor,
    runs inside `withBookingConcurrencyGuard` with `pg_advisory_xact_lock` per
    resource, re-checks slot availability + conflicts, evaluates pricing
    (incl. promo), debits wallet, writes Booking + BookingResource + Payment.
  - `createBookingSeriesInDb` — multi-slot atomic. Pre-validates each slot,
    builds prepared list, enforces total ≤ wallet balance, then creates each
    booking + payment + wallet debit + promo redemption.
  - `createBookingHoldsInDb` — same validation tree but produces holds
    instead of bookings (for top-up flow).
- `src/lib/bookings/concurrency.ts` — serializable tx + advisory locks keyed on
  resource type/id; bounded retries.
- `src/lib/bookings/availability-validator.ts` — `assertBookingSlotAvailable`
  (opening hours / exceptions / instructor schedule / event blocks) +
  `assertBookingSlotConflictsClear` (overlapping bookings/holds/events).
- `src/lib/bookings/policy.ts` — cancellation deadlines (morning rule + N hours).
- `src/lib/bookings/operations.ts` — admin status transitions (cancel-with-refund,
  settle pending payment, set payment state).
- `src/lib/bookings/auto-complete.ts` — `completePastConfirmedBookings()` called
  by every booking/earnings read.
- `src/lib/bookings/holds.ts` — short-lived `BookingHold` rows, attached to
  pricing, picked up on resume; `expireStaleBookingHolds` GCs them.
- `src/lib/bookings/reschedule.ts` — admin reschedule path (re-runs the same
  validators).
- `src/lib/availability/{db,engine}.ts` — availability snapshot + slot
  generation; week-specific instructor `ResourceSchedule` overrides base.

### Domain rules
- Fixed 60-minute sessions, whole-hour starts.
- One court OR (court + instructor) per booking; multi-slot/multi-court via
  series API.
- Instructor is a scarce resource across courts (one booking per start time).
- Customer self-service pays from wallet only; admin can choose
  `wallet | cash | auto` (auto falls back to `pending_payment`).
- Cancellation:
  - morning slots (08:00–12:00): only until 00:00 previous day;
  - other slots: ≥ `CUSTOMER_FREE_CANCELLATION_HOURS` before start.
- Wallet refund on eligible cancellation, no refund on `completed`.
- Notifications routed through Telegram common chat + assigned trainer DM
  (`src/lib/notifications/bookings.ts`).

### Concurrency / consistency
- Serializable tx + advisory locks on `(resourceType, resourceId)`.
- Hold row excluded from its own conflict check via `excludeHoldId`.
- Series path: total ≤ balance asserted inside tx before any debit.

---

## Part 2 — Flaws / Risks Found

Severity legend: **H** = correctness/money, **M** = UX/operations, **L** = minor.

1. **H — Guest booking path can silently mint accounts.**
   `createBookingInDb` / `createBookingSeriesInDb` / `createBookingHoldsInDb`
   contain a fallback that creates a new `User` row from `input.customer`
   when `customerUserId` is absent, with `passwordHash = "guest-booking-placeholder"`.
   The API route at `app/api/bookings/route.ts` blocks this with a 401 today,
   but the persistence layer trusts callers. Any future caller (admin tool,
   bot, internal job) that forgets to set `customerUserId` will create
   passwordless rows colliding on email. **Action:** make `customerUserId`
   required in the persistence signature; move "find-or-create" to one
   explicit admin-only helper.

2. **H — Series wallet check is text-only.**
   `createBookingSeriesInDb` throws `"Недостаточно средств на балансе для броинрования"`
   (also a typo: "броинрования"). It is not an `InsufficientWalletBalanceError`,
   so the route maps it to 500. Multi-slot top-up + resume relies on the holds
   API instead, but any direct call to series with low balance returns an
   opaque error. **Action:** raise the same typed error; fix typo.

3. **M — Hold series and booking series don't share a single source of truth.**
   The two functions duplicate ~250 lines of validation/pricing/promo logic.
   Drift risk is real (e.g. one path counts promo redemptions per-slot vs
   per-series). **Action:** extract `prepareSlot(...)` helper used by both.

4. **M — Series promo limits double-count.**
   `createBookingSeriesInDb` checks `customerCount + input.slots.length` against
   `perCustomerLimit` but inside the loop applies promo to every slot without
   re-checking after each `promoCodeRedemption.create`. If two parallel series
   requests slip past advisory locks (different resources), aggregate
   redemption can briefly exceed the limit between the prefetch count and
   commit. Low likelihood, real risk. **Action:** rely on a unique
   `(promoCodeId, customerId, bookingId)` index + re-check post-insert, or
   `SELECT ... FOR UPDATE` the promo row.

5. **M — `paymentMode` is accepted by persistence but the public route ignores it.**
   `app/api/bookings/route.ts` does not forward `parsed.data.paymentMode`,
   so the public API is effectively wallet-only. That's the current product
   intent, but the validation schema lets clients pass `cash` and silently
   have it dropped. **Action:** strip `paymentMode` from public schema, accept
   it only on the admin route.

6. **M — Demo fallback runs on real DB error.**
   The catch block in `app/api/bookings/route.ts` falls back to
   `createBookingMvp` when `ALLOW_DEMO_FALLBACK=true`. In a misconfigured
   prod, a transient DB error would create a "draft" booking that doesn't
   exist anywhere, returning a 201 to the customer. **Action:** gate demo
   fallback to `NODE_ENV !== "production"`.

7. **M — `cancelBookingWithRefundInTx` only refunds if a `booking_charge`
   wallet row exists.**
   That's correct for wallet-paid bookings, but `pending_payment` bookings
   paid in cash that were later marked `paid_manual` won't trigger a wallet
   refund here (by design). No flaw, but the policy is invisible — the
   operator might expect a cash refund prompt. **Action:** UI hint in
   admin cancel modal that cash-paid bookings need manual cash refund.

8. **L — `isSameVenueHourAsNow` allows late-current-hour booking only if
   caller passes `allowCurrentHourLateBooking`.**
   The customer API never sets it, the admin path sometimes does. Behavior
   is correct but undocumented. **Action:** add a comment / unit test that
   pins both paths.

9. **L — Concurrency guard does not lock event-court rows.**
   `ClubEventCourt` enforcement is done via `assertBookingSlotConflictsClear`
   inside the tx, but the advisory lock set only covers booked court/instructor
   ids. Two parallel bookings on the same court but different start hours
   that both newly conflict with an event being inserted concurrently
   could race. Very narrow. **Action:** include `event:<id>` advisory lock
   for event mutations (already partly there) and verify on the booking side.

10. **L — `extractHoldPromoCode` reads `pricingBreakdownJson` shape that the
    hold writer doesn't always emit as `{ items, promoCode }`.**
    `createBookingHoldsInDb` writes `{ items, promoCode }` for promo holds,
    but `createBookingInDb` (no series) sometimes writes a plain array breakdown.
    `extractHoldPromoCode` only matches the `{ promoCode }` object shape.
    Drift risk if hold creation path changes. **Action:** centralize hold
    breakdown serialization.

11. **L — `service.ts` exports `createBookingMvp` that still exists as a
    "demo" path.** It uses the placeholder payment provider and produces a
    booking object that is never persisted. It is a footgun for new callers
    (e.g. the bot). **Action:** delete once demo fallback is gated.

---

## Part 3 — Telegram Booking Bot — Implementation Plan

### Goal
Allow verified customers to create court/training bookings entirely inside
Telegram, reusing the existing persistence + concurrency + pricing + wallet
stack. No new domain logic; the bot is a thin conversational front-end.

### Non-goals (v1)
- No guest checkout (Telegram conversation must map to an existing verified
  customer).
- No registration through the bot (registration stays on the web).
- No top-up inside Telegram (link out to `/account`).
- No event registration (separate feature).
- No promo code input UI (v1).
- No reschedule/cancel via bot v1 (deep-link to `/account/bookings`).

### Constraints
- Reuse the existing polling bot in `src/lib/notifications/telegram-verify-bot.ts`.
  Do NOT introduce a webhook server or a second process. Add booking commands
  to the same dispatcher.
- All booking writes must go through `createBookingInDb` /
  `createBookingSeriesInDb`. Do not duplicate validation.
- Identity: a Telegram chat is authorized iff there is a `User` with
  `telegramChatId = chatId`, `phoneVerifiedAt != null`, `emailVerifiedAt != null`,
  `role = customer`. Anything else gets a "log in on the web first" message.
- Russian-only UI text. Same KZT formatting as the web.
- Asia/Almaty for all date/time strings shown to the user; internally use
  the existing `venueDateTimeToUtc` helper.

### Identity & session
- New column or reuse `User.telegramChatId` (already populated by phone
  verification). Lookup is `prisma.user.findFirst({ where: { telegramChatId, role: "customer" } })`.
- Per-chat ephemeral conversation state lives in a new table
  `TelegramBookingSession` (or in-memory map if we want zero migrations for
  v1; recommendation: DB table, see Schema below — survives restarts).
- One active session per chat at a time. `/cancel` clears it. Sessions
  auto-expire after 15 min of inactivity.

### Schema additions (1 migration)
```
model TelegramBookingSession {
  id           String   @id @default(cuid())
  chatId       String   @unique
  userId       String
  state        Json     // { step, locationId, sportSlug, serviceCode, date, slots: [{startTime, courtId?}], instructorId?, holdIds? }
  updatedAt    DateTime @updatedAt
  expiresAt    DateTime
  user         User     @relation(fields: [userId], references: [id])
  @@index([expiresAt])
}
```
No other DB changes. We reuse `BookingHold` for top-up flow.

### Commands & flow
Top-level commands (handled in the existing dispatcher next to `/start`,
`/registerchat`, `/getchatid`):

- `/book` — start a new booking conversation.
- `/mybookings` — show next 5 upcoming bookings with a "Open in web" deep link.
- `/balance` — show wallet balance + top-up link.
- `/cancel` — abort current conversation.
- `/help` — short usage text.

Conversation steps for `/book` (inline keyboards, one screen per step):

1. **Sport** — buttons from `Sport.findMany({ active: true, sortOrder })`.
2. **Service** — court rental / training, from `Service` rows for that sport
   (filtered by `active` + matching `locationId`).
3. **Trainer** (only if `service.requiresInstructor`) — `Instructor` rows
   linked to the sport + location.
4. **Date** — show next 7 days as buttons; "later →" paginates by 7.
5. **Time slots** — call the availability lib (same code path as
   `app/api/availability`), render hours as a grid of buttons.
   Multi-select supported (toggle); show running total + "Подтвердить" CTA.
6. **Court** (court mode, multi-court allowed) — show available courts
   intersected across selected slots; user picks 1+ courts.
7. **Confirm** — show breakdown + total + wallet balance.
   Inline buttons: `Оплатить с баланса` / `Изменить` / `Отмена`.
8. **Commit** — call `createBookingInDb` (single) or `createBookingSeriesInDb`
   (multi). On `InsufficientWalletBalanceError`: reply with shortfall +
   short-lived top-up deep link (web `/account?topup=…`); offer "Я пополнил"
   button that retries the same payload.

On success: send a confirmation message with date/time/court/trainer/total +
auto-fires `notifyBookingCreated` (already done by persistence).

### Module layout
```
src/lib/notifications/
  telegram-verify-bot.ts          # extend dispatcher (add /book branch)
  telegram-booking-bot/
    index.ts                      # exports startTelegramBookingBot()
    dispatcher.ts                 # message + callback_query routing
    session.ts                    # load/save/expire TelegramBookingSession
    steps/
      pick-sport.ts
      pick-service.ts
      pick-trainer.ts
      pick-date.ts
      pick-slots.ts
      pick-courts.ts
      confirm.ts
    keyboard.ts                   # inline keyboard helpers (sport/date/time grids)
    formatters.ts                 # KZT, RU date, breakdown
    commit.ts                     # thin wrapper around persistence
```

Reuses without copying:
- `src/lib/availability/db.ts` + `engine.ts` for slot computation.
- `src/lib/bookings/persistence.ts` for writes.
- `src/lib/bookings/policy.ts` for any policy text.
- `src/lib/wallet/queries.ts` for balance.
- `src/lib/locations/service.ts` (multi-location ready).

### Telegram API surface
- We currently use long polling (`getTelegramUpdates`) and `sendMessage`.
- Need to add `answerCallbackQuery` + `editMessageText` + `editMessageReplyMarkup`
  to `src/lib/notifications/telegram.ts`. Same bot token.
- `update.callback_query` was not handled in the verify bot — extend
  `handleUpdate` to dispatch both `message` and `callback_query`.

### Env / config
- `ENABLE_TELEGRAM_BOOKING_BOT=true|false` (default true). The booking bot
  is started from the same `instrumentation.ts` next to the verify bot.
- Reuses `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME`.
- New: `TELEGRAM_BOOKING_SESSION_TTL_MIN=15`.

### Concurrency
- Booking commit goes through the existing concurrency guard — no extra work.
- Session writes use plain `prisma.telegramBookingSession.upsert`.
- If a customer fires `/book` twice quickly, the second `/book` resets the
  session and the first message becomes stale; we drop stale
  `callback_query` IDs.

### Edge cases / rules to mirror
- Block past-time slots (`startAt > now` already enforced in persistence;
  the UI must also filter `isPast`).
- Trainer must be free across selected slots (engine handles this).
- Insufficient balance → top-up resume via the existing holds flow. v1: we
  do NOT pre-create holds — we let the commit fail and surface the typed
  error. (Pre-holds would mirror the web exactly; consider for v1.1.)
- Cancellation rules: not in scope (deep-link out).
- Multi-location: if more than one active `Location`, add a step 0 to pick
  one; otherwise auto-select.
- Bot text must stay Russian; no admin/internal jargon (per lesson 2026).

### Verification / test plan
- Unit: `formatters` (KZT, RU date), `keyboard` (paginators).
- Integration: spin up an in-process fake of `sendMessage`/`getUpdates` and
  drive the dispatcher through the full happy path + low-balance path +
  unauthorized chat path.
- E2E (manual): point a test bot at local dev, register a verified customer,
  walk through `/book`.

### Phasing
- **v1.0** — court rental, single slot, single court, single location,
  Russian, no promo, no events, no reschedule.
- **v1.1** — multi-slot + multi-court via series, low-balance top-up resume
  with pre-created holds.
- **v1.2** — training service (instructor step).
- **v1.3** — `/mybookings` cancel + reschedule inline.
- **v2** — event registration, promo code input.

### Open questions
1. Single bot token or split (verify vs booking)? Recommend single — one
   polling loop, one dispatcher.
2. Do we want the bot to push proactive reminders 2 h before booking? Out
   of scope here, but cheap to add once the chat-id mapping is live.
3. Do we accept bookings from chats that aren't 1:1 (groups)? No — refuse
   anything except `chat.type === "private"`.

### Prerequisite flaw fixes
All blockers closed in this session (see Review). The bot can be built directly
on top of the current persistence layer with no further refactors required.

---

## Part 4 — Implementation Checklist (v1.0)

Order matters; each step is independently shippable.

### Step 1 — Schema migration
- [ ] Create `prisma/migrations/<timestamp>_telegram_booking_session/migration.sql`
  with the `TelegramBookingSession` table from "Schema additions" above.
- [ ] Add the model to `prisma/schema.prisma`.
- [ ] Add the back-relation field on `User`: `telegramBookingSessions TelegramBookingSession[]`.
- [ ] Stop `next dev`, run `npx prisma migrate deploy && npx prisma generate`.

### Step 2 — Telegram API helpers
- [ ] In `src/lib/notifications/telegram.ts`, add:
  - `answerCallbackQuery({ callbackQueryId, text?, showAlert? })`
  - `editMessageText({ chatId, messageId, text, replyMarkup? })`
  - `editMessageReplyMarkup({ chatId, messageId, replyMarkup })`
  - `InlineKeyboardMarkup` type matching Telegram's Bot API.
- [ ] Extend the `TelegramUpdate` type with `callback_query`.

### Step 3 — Bot scaffolding
- [ ] Create `src/lib/notifications/telegram-booking-bot/`:
  - `index.ts` — `startTelegramBookingBot()` exports.
  - `dispatcher.ts` — `handleUpdate(update)` routing `message` / `callback_query`.
  - `session.ts` — `loadSession`, `saveSession`, `clearSession`, `expireStaleSessions`.
  - `keyboard.ts` — inline-keyboard helpers (sport grid, date row, slot grid, court grid, confirm row).
  - `formatters.ts` — `formatKzt`, `formatRuDate`, `formatBreakdown`.
  - `auth.ts` — `resolveAuthorizedCustomer(chatId)` returning the verified `User` row or null.
- [ ] Wire `startTelegramBookingBot()` into `instrumentation.ts` behind
  `ENABLE_TELEGRAM_BOOKING_BOT` (default true) and `TELEGRAM_BOT_TOKEN` presence.
- [ ] Refuse anything except `chat.type === "private"`.

### Step 4 — Conversation steps (`steps/`)
Each step exports `enter(ctx)` (renders) and `handle(ctx, callbackData)` (transitions).

- [ ] `pick-sport.ts` — list `Sport.findMany({ active: true, sortOrder })`.
- [ ] `pick-service.ts` — `Service` rows for picked sport (rental / training).
- [ ] `pick-trainer.ts` — skipped if `!requiresInstructor`; else `Instructor` rows linked to sport+location.
- [ ] `pick-date.ts` — next 7 weekdays, paginatable.
- [ ] `pick-slots.ts` — fetch availability via `src/lib/availability/db.ts` + `engine.ts`,
  render `availableSlots` as 4-column inline grid. Disable `isPast` slots.
- [ ] `pick-courts.ts` — intersect `availableCourtIds` across all selected slots.
- [ ] `confirm.ts` — show breakdown + total + wallet balance from `src/lib/wallet/queries.ts`.

### Step 5 — Commit path
- [ ] `commit.ts` — pick `createBookingInDb` vs `createBookingSeriesInDb` based on
  slot count. Always pass `customerUserId` (required since flaw #1 fix).
- [ ] Catch `InsufficientWalletBalanceError` / `SeriesInsufficientWalletBalanceError`
  → render top-up deep link to `/account` + "Я пополнил" retry button.
- [ ] Catch `PromoIneligibleError` → friendly message (v1 has no promo input, but
  defensive).
- [ ] On success, `notifyBookingCreated` already fires inside persistence.
  Send the chat a confirmation message with date / time / court / total.

### Step 6 — Commands wiring
In the existing `telegram-verify-bot.ts` dispatcher, add command branches:
- [ ] `/book` → delegate to booking bot dispatcher (start a new session).
- [ ] `/mybookings` → list next 5 upcoming bookings (call `src/lib/account/bookings.ts`).
- [ ] `/balance` → wallet balance + `/account` deep link.
- [ ] `/cancel` → clear session.
- [ ] `/help` → static text listing all commands.

### Step 7 — Identity guard
- [ ] Every command starts with `resolveAuthorizedCustomer(chatId)`. If null,
  reply with "Войдите в личный кабинет на сайте" + login link. Do not start a session.

### Step 8 — Session GC
- [ ] Add `expireStaleSessions()` call at top of every dispatcher entry
  (cheap — indexed delete where `expiresAt < now`).
- [ ] Bump `expiresAt = now + TELEGRAM_BOOKING_SESSION_TTL_MIN` on every save.

### Step 9 — Tests
- [ ] Unit: `formatters.ts` (KZT spacing, RU date).
- [ ] Unit: `keyboard.ts` paginators.
- [ ] Integration: fake `sendMessage`/`getUpdates` driver in
  `tests/integration/telegram-booking-bot.test.ts` covering:
  - Unauthorized chat → reject.
  - Happy path: `/book` → sport → service → date → slot → court → confirm → committed booking row exists.
  - Insufficient balance path: low wallet → top-up prompt shown.
  - `/cancel` mid-flow clears session.

### Step 10 — Manual E2E
- [ ] Local: point a Telegram test bot at dev, walk through `/book` end-to-end
  with the seeded customer account.
- [ ] Confirm `notifyBookingCreated` posts to admins/common chat as expected.

### Out of scope for v1.0
Defer to follow-up phases (see "Phasing" above):
- Multi-slot / multi-court (v1.1).
- Training mode (v1.2) — implement the `pick-trainer` step but skip wiring until v1.2.
- Cancel / reschedule from bot (v1.3).
- Event registration, promo input (v2).
- Pre-created holds for low-balance resume (v1.1).
- Proactive reminders.

---

## Review (2026-05-12)

The following items from Part 2 (Flaws / Risks) were fixed:

**#11 (L) — Delete `createBookingMvp` demo path**
- `src/lib/bookings/service.ts`: removed `createBookingMvp` and all its imports (`evaluatePricing`, `getPaymentProvider`); kept only the `policy.ts` re-exports.
- `app/api/bookings/route.ts`: removed `createBookingMvp` import, removed `allowDemoFallback` variable, removed the entire demo fallback catch branch; removed unused `demoComponentPrices` import. `demoServices` import retained (still used for `effectiveService` fallback lookup on line 45).

**#10 (L) — Normalize hold `pricingBreakdownJson` shape**
- `src/lib/bookings/persistence.ts`: both `createBookingInDb` and `createBookingHoldsInDb` now always write `{ items: [...], promoCode?: string }` for hold breakdown (plain array eliminated). Added comment above `extractHoldPromoCode` documenting the normalized contract.

**#4 (M) — Series promo redemption race**
- `src/lib/bookings/persistence.ts`: added `SELECT ... FOR UPDATE` row-level lock on `PromoCode` row in all three booking functions (`createBookingInDb`, `createBookingSeriesInDb`, `createBookingHoldsInDb`) before reading redemption counts.

**#3 (M) — Extract shared `prepareBookingSlot` helper**
- `src/lib/bookings/persistence.ts`: extracted `prepareBookingSlot()` helper (~80 lines) that handles hold resolution, `assertBookingSlotAvailable`, event advisory locking, `assertBookingSlotConflictsClear`, `evaluatePricing`, and promo application. All three public functions now call this helper for per-slot work, eliminating ~150 lines of duplication. Booking `pricingBreakdownJson` keeps the existing array shape; hold shape is the normalized object form from #10.

**#9 (L) — Event-court advisory lock on booking writes**
- Inside `prepareBookingSlot`: before `assertBookingSlotConflictsClear`, queries for `ClubEvent` rows overlapping the slot on the same court/instructor and acquires `pg_advisory_xact_lock(hashtext(eventId))` for each — consistent with the key format in `src/lib/events/service.ts`.

**#7 (M) — Admin cancel modal cash-paid hint**
- `src/components/admin/admin-booking-actions-modal.tsx`: when `row.paymentProvider === "manual" && row.paymentStatus === "paid"`, the cancel confirmation dialog now shows a different description reminding the operator to return cash manually.
- `src/messages/ru.json`: added `admin.bookings.cancelConfirmDescriptionCashPaid` key.

**#8 (L) — Document and pin `allowCurrentHourLateBooking`**
- `tests/integration/booking-persistence.test.ts`: added two new tests:
  - "rejects same-current-hour booking on the customer path" — verifies no `allowCurrentHourLateBooking` flag blocks the slot.
  - "accepts same-current-hour booking on the admin path" — verifies `allowCurrentHourLateBooking: true` accepts the slot.

**#1 (H) — Mandatory `customerUserId` in persistence**
- `src/lib/bookings/persistence.ts`: `customerUserId` is required across
  `createBookingInDb` / `createBookingSeriesInDb` / `createBookingHoldsInDb`.
- Removed the find-by-email + `passwordHash: "guest-booking-placeholder"`
  fallback in all three. Strict `findUnique({ id })`; throws if missing.
- `app/api/bookings/route.ts`: 404 when session user missing instead of
  trusting the persistence fallback.

**#2 (H) — Typed series wallet error + typo fix**
- New `SeriesInsufficientWalletBalanceError`
  (code `INSUFFICIENT_WALLET_BALANCE_SERIES`).
- Series throws typed error instead of plain `Error("…броинрования")`;
  message corrected.
- `app/api/bookings/series/route.ts` catches via `instanceof`.

**#6 (M) — Demo fallback gated**
- `app/api/bookings/route.ts`: `allowDemoFallback` now requires
  `NODE_ENV !== "production"` in addition to the env flag.

**#5 (M) — `paymentMode` on public schema**
- N/A: verified `src/lib/validation/booking.ts` never accepted `paymentMode`
  on the public schema in the first place. No code change required.

**Foreign-hold integration test brittleness (pre-existing)**
- `tests/integration/booking-persistence.test.ts:293` was asserting
  `bookingsAtHeldSlot == 0` with `startAt >= dateMidnight`. Multiple test
  offsets (46/47/48) collapse to the same Monday after weekend-skip, leaking
  bookings into the count. Tightened to exact-slot match
  `startAt = venueDateTimeToUtc(date, "12:00")`.

### Final test results
- `npx tsc --noEmit`: 0 errors
- `npm run lint`: 0 errors (5 pre-existing warnings, unchanged)
- `npm run test:integration -- booking-persistence`: **34/34 pass**

### Status
All flaws from Part 2 closed. Booking system is ready for the Telegram bot
work in Part 4.
