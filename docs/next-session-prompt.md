# Next Session Prompt (Copy/Paste)

## Current State: Promo Codes Complete

```text
We are in D:\Websites\padelsquash.

Read these first (in order):
- README.md
- tasks/lessons.md
- tasks/todo.md
- prisma/schema.prisma

Current state:
- Stack: Next.js 16 App Router, React 19, TypeScript, Prisma 6, PostgreSQL Docker (127.0.0.1:55432), Auth.js Credentials, Russian UI, KZT, Asia/Almaty.
- CSS: BEM naming, Tailwind v4 @apply only — NO utility classes in JSX.

## Completed Features

### Feature 1: Staff / Role Management
- `User.active` flag, `/admin/staff` CRUD, activation links, auth guards reject inactive accounts.

### Feature 2: Trainer Telegram Notifications
- Common chat + trainer DMs for bookings and club events.
- Daily digest cron at `POST /api/cron/daily-digest`.
- Polling bot at `POST /api/telegram/webhook`.

### Feature 3: Promo Codes (COMPLETE)
All steps done:
1. Prisma schema: `PromoCode` + `PromoCodeRedemption` models, `Booking.promoCodeId` + `Booking.discountKzt`.
   Migration: `20260511041829_promo_codes`
2. `src/lib/promo/apply.ts` — `applyPromoToPricing()` + `PromoIneligibleError` with typed codes.
3. `src/lib/admin/promo-codes-schema.ts` — Zod create/update schemas.
4. `src/lib/admin/promo-codes.ts` — CRUD service: list, getById, create, update, archive (audit logged).
5. `src/lib/validation/booking.ts` — `promoCode?` added to all 3 booking schemas.
6. `src/lib/bookings/persistence.ts` — promo wired into single booking, series, and holds paths.
   - Hold JSON: `{ items: [...], promoCode: "CODE" }` format when promo applied.
   - Hold-resume reads stored promo from hold JSON as fallback.
   - `PromoCodeRedemption` inserted per booking in same transaction.
7. API routes pass `promoCode` through: `app/api/bookings/route.ts`, `series/route.ts`, `holds/route.ts`.
8. `app/api/promo-codes/preview/route.ts` — POST preview endpoint (auth required).
9. `src/lib/bookings/url-state.ts` — `promoCode?` field + `?promo=CODE` query param.
10. `src/components/admin/admin-nav-config.ts` — Промокоды nav item added.
11. `app/admin/promo-codes/page.tsx` — list + create + edit + archive.
12. `app/admin/promo-codes/[id]/page.tsx` — detail + redemptions table.
13. `src/components/booking/live-booking-form.tsx` — promo panel in Step 3.
14. `src/components/admin/create-booking-form.tsx` — promo panel in Step 3.
15. `src/lib/notifications/bookings.ts` — promo line appended to notifications.
16. `tests/unit/promo-apply.test.ts` — 16 unit tests, all passing.
17. `prisma/seed.ts` — WELCOME10 demo promo (non-production).
18. `src/styles/booking.scss` — `.booking-flow__promo*` CSS classes.

Pending manual smoke test:
1. Run `npx prisma migrate dev` to apply `20260511041829_promo_codes` migration.
2. Browser smoke: create promo in `/admin/promo-codes` → apply in `/book` → confirm booking → check notifications include promo line.
3. Admin create-booking promo panel smoke.

Rules:
- Read local `.next-docs` before any Next.js work.
- Russian-only UI strings.
- Stop the dev server before `npx prisma generate` on Windows (DLL lock).
- Do not skip hooks on commits.

Verification commands:
- `npx tsc --noEmit` (0 errors confirmed)
- `npm run lint` (0 errors confirmed, pre-existing img warnings only)
- `npx vitest run tests/unit/promo-apply.test.ts` (16/16 passing)
```
