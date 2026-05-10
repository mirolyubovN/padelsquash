# Feature: Promo Codes for Bookings

Admins configure promo codes; customers apply them during the booking flow to discount the wallet charge.

## Scope

- Promo codes apply to court rental + training bookings (`/book` and admin-created bookings in `/admin/bookings/create`).
- Out of scope (v1): event registrations, top-up bonuses (already covered by `WalletBonusConfig`), gift cards.
- Russian-only UI strings, KZT only, Asia/Almaty timezone for validity windows.

## Data Model

Add new Prisma models:

```prisma
enum PromoDiscountType {
  percent
  fixed_kzt
}

enum PromoCodeStatus {
  active
  paused
  archived
}

model PromoCode {
  id                    String              @id @default(cuid())
  code                  String              @unique // upper-case, 3..32 chars, [A-Z0-9_-]
  description           String?
  discountType          PromoDiscountType
  discountValue         Decimal             @db.Decimal(10, 2) // percent (1..100) or fixed KZT
  maxDiscountKzt        Decimal?            @db.Decimal(10, 2) // optional cap when percent
  minOrderKzt           Decimal?            @db.Decimal(10, 2)
  validFrom             DateTime?
  validUntil            DateTime?           // inclusive end-of-day in Asia/Almaty (store UTC)
  totalRedemptionLimit  Int?                // null = unlimited
  perCustomerLimit      Int?                @default(1)
  appliesToServiceCodes String[]            @default([]) // empty = all services; otherwise filter by Service.code
  appliesToSportIds     String[]            @default([]) // empty = all sports
  firstBookingOnly      Boolean             @default(false)
  status                PromoCodeStatus     @default(active)
  createdByUserId       String?
  createdAt             DateTime            @default(now())
  updatedAt             DateTime            @updatedAt

  redemptions PromoCodeRedemption[]

  @@index([status])
  @@index([validFrom, validUntil])
}

model PromoCodeRedemption {
  id              String   @id @default(cuid())
  promoCodeId     String
  customerId      String
  bookingId       String?  // null when applied to a series — see below
  amountKzt       Decimal  @db.Decimal(10, 2) // discount actually applied
  createdAt       DateTime @default(now())

  promoCode PromoCode @relation(fields: [promoCodeId], references: [id], onDelete: Restrict)

  @@index([promoCodeId, createdAt])
  @@index([customerId, createdAt])
  @@unique([promoCodeId, bookingId])
}
```

Booking-side hook-up:
- Add `promoCodeId String?` and `discountKzt Decimal? @db.Decimal(10, 2)` to `Booking`.
- Persist the promo metadata into `Booking.pricingBreakdownJson` so historical bookings still render the discount even if the promo is later archived.
- Add `WalletTransactionType.promo_discount` is **not** needed — the discount lowers `priceTotal`; the wallet debit is only the post-discount amount. The breakdown JSON is the source of truth for what was discounted.

Migration name: `20260601000000_promo_codes`.

## Pricing Engine

`src/lib/pricing/engine.ts` currently returns `{ total, currency, breakdown }`.

Add a new helper `applyPromoToPricing(pricing, promo, context)` in `src/lib/promo/apply.ts`:

- Takes the engine's pricing output + the resolved `PromoCode` row + `{ customerId, isFirstBooking, serviceCode, sportId }`.
- Validates eligibility (status, validFrom/validUntil in venue tz, sport/service filters, per-customer cap, total cap, first-booking-only, minOrderKzt).
- Computes discount: percent (with optional cap) or fixed; never reduces total below 0.
- Returns `{ discountKzt, totalAfterDiscount, breakdown: pricing.breakdown + promoLine }`.

Eligibility errors are thrown as a typed `PromoIneligibleError` with codes: `not_found`, `inactive`, `expired`, `not_started`, `min_order`, `service_excluded`, `sport_excluded`, `per_customer_limit`, `total_limit`, `first_booking_only`.

Multi-slot series: discount is applied **per booking row** (not pooled). The per-customer limit counts redemptions, so if a customer books 3 slots in one submit with a `perCustomerLimit = 1` code, only the first slot gets the discount and the remaining slots fall back to full price (alternative: reject the whole series — pick this if simpler; document the choice in the PR).

Recommended choice: **reject series submit when discount cannot apply to all selected slots**. This keeps the displayed total honest.

## Booking Persistence Wiring

`src/lib/bookings/persistence.ts`:

- `createBookingInDb`, `createBookingSeriesInDb`, `createBookingHoldsInDb`: accept optional `promoCode?: string` (raw input from the form, normalized server-side to upper-case).
- Inside the existing transaction (`withBookingConcurrencyGuard`), after `evaluatePricing` and before computing `currentBalanceKzt < pricing.total`:
  1. `findUnique` the promo by code with `status: "active"` (lock with `tx.$queryRaw` `SELECT ... FOR UPDATE` if total-cap is set; otherwise the unique redemption row prevents double-spend).
  2. Count existing redemptions for that customer (and total) inside the same tx.
  3. Run `applyPromoToPricing`; replace `pricing.total` with the discounted total before the wallet check.
  4. After `booking.create`, insert `PromoCodeRedemption` (the `@@unique([promoCodeId, bookingId])` is the safety net).
  5. Persist `booking.promoCodeId`, `booking.discountKzt`, and add a `promoLine` to `pricingBreakdownJson`.
- For holds (`createBookingHoldsInDb`): store the requested promo code in `BookingHold.pricingBreakdownJson` so the resume path re-validates and re-applies it. Holds **do not** create redemption rows; only the converted `Booking` does.
- Insufficient balance still creates a hold; the hold's `amountRequired` is the discounted total.

Edge case: if a booking is later cancelled and refunded, decide whether to "return" the redemption. Default: **do not delete the redemption row** (it counts as used). Add a `cancelledAt` column to `PromoCodeRedemption` if/when product wants to free up a slot — defer.

## Admin: Manage Promo Codes

New route `/admin/promo-codes` (admin + super_admin):

- Page: list view with columns code, description, discount summary (`-15%` or `-2 000 ₸`), validity window, used / limit, status, actions.
- Filters: status (active/paused/archived/all), search by code.
- "Создать промокод" opens a modal with form:
  - `code` (auto-uppercase, validated against regex; check uniqueness server-side)
  - `description` (textarea, optional)
  - `discountType` (radio: процент / фиксированная сумма)
  - `discountValue` (number; percent 1–100 or KZT)
  - `maxDiscountKzt` (only when percent)
  - `minOrderKzt` (optional)
  - `validFrom` / `validUntil` (date pickers, venue tz)
  - `totalRedemptionLimit` (number, optional)
  - `perCustomerLimit` (number, default 1, set 0/blank for unlimited)
  - `appliesToServiceCodes` (multi-select from active services; empty = все)
  - `appliesToSportIds` (multi-select from active sports; empty = все)
  - `firstBookingOnly` (checkbox)
  - `status` (active/paused)
- Detail page `/admin/promo-codes/[id]`: same form + recent redemptions table (date, customer link to `/admin/clients/[id]`, booking link, discount applied) + total stats.
- "Архивировать" sets status to `archived` (cannot be re-applied; existing bookings keep their breakdown).
- Server actions in `src/lib/admin/promo-codes.ts`:
  - `listPromoCodes`, `getPromoCodeById`, `createPromoCode`, `updatePromoCode`, `archivePromoCode`.
  - All write actions call `assertAdmin()` and `prisma.auditLog.create({ action: "promo.create" | "promo.update" | "promo.archive", entityType: "promo_code", entityId, detail: <diff> })`.
- Add nav entry under "Каталог" / "Финансы" group in `app/admin/layout.tsx` (find the existing nav block and place after `/admin/wallet`).

## Customer: Apply Promo Code in Booking Flow

`src/components/booking/live-booking-form.tsx`:

- On the final review step (after slot/court/instructor selection, before "Подтвердить"), add a collapsible "Промокод" panel:
  - Input field (auto-uppercase) + "Применить" button
  - Calls `POST /api/promo-codes/preview` with `{ code, serviceCode, sportSlug, slots: [{ startTime, courtId? }], date, locationId, instructorId? }`.
  - Endpoint validates and returns `{ ok: true, discountKzt, totalAfterDiscount, breakdown }` or `{ ok: false, code, message }`.
  - On success: show "Скидка по промокоду CODE: −X ₸" line and updated total; persist `appliedPromoCode` in the form's URL state (`src/lib/bookings/url-state.ts`).
  - On failure: inline Russian error from a code → message map.
- Submit (`POST /api/bookings`, `POST /api/bookings/holds`) sends `promoCode` in the payload.
- The server re-validates inside the transaction; client-side preview is informational only.

Admin manual booking (`/admin/bookings/create`) gets the same input — admins frequently apply promo on behalf of a customer.

## API Routes

- `POST /api/promo-codes/preview` — public (requires customer session for accurate per-customer cap), 5 req/min rate-limited per session/IP.
- All admin CRUD goes through server actions on `/admin/promo-codes`; no public REST surface.

## Validation Rules (Zod)

`src/lib/admin/promo-codes-schema.ts`:
- `code`: regex `/^[A-Z0-9_-]{3,32}$/`, transformed to upper-case before validation
- `discountValue`: positive; if percent, max 100
- `validUntil` >= `validFrom` when both present
- `perCustomerLimit`, `totalRedemptionLimit`: `>= 0` integer (0 / null = unlimited)
- `minOrderKzt`: `>= 0`

## Notifications

- Add a line `Промокод: CODE (−X ₸)` to admin booking-created notifications in `src/lib/notifications/bookings.ts` (read from `pricingBreakdownJson`).
- Customer booking confirmation email/Telegram (if any) gets the same line.

## Tests

- `src/lib/promo/apply.test.ts` (vitest unit): all eligibility branches, percent vs fixed, cap, min-order, first-booking detection.
- `src/lib/bookings/persistence.promo.test.ts` (vitest integration with test DB): single + series booking, hold→resume, double-redemption race (run two concurrent `createBookingInDb` against a `totalRedemptionLimit = 1` promo and assert exactly one wins via the unique constraint).
- Playwright e2e: customer applies a code in `/book`, sees discounted total, completes wallet payment, sees promo line on `/account/bookings`.

## README/Docs

After ship: add a "Promo Codes" subsection under "Core Product Flows" in `README.md`, and add `/admin/promo-codes` to the admin routes table.

## Migration / Rollout Steps

1. `npx prisma migrate dev --name promo_codes` (stop dev server first on Windows).
2. Run unit + integration suites.
3. Deploy with no promos active — feature is a no-op until super admin creates one.
4. Seed a demo promo in `prisma/seed.ts` for local/dev only (gated by `NODE_ENV !== "production"`).

## Open Questions

- Stacking with wallet top-up bonus: independent (top-up is on credit, promo is on debit — no interaction). Confirm with stakeholder.
- Refund-on-cancel behavior: default keeps the redemption. Revisit if support tickets pile up.
- Multi-slot series with limited promo: reject whole submit (recommended) vs apply to first only.
