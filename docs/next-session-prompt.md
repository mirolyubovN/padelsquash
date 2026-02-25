# Next Session Prompt (Copy/Paste)

Use the following prompt to continue development in a new session.

```text
Continue development on D:\\Websites\\padelsquash.

Priority for this session: finish and verify the in-progress trainer model refactor started on 2026-02-24.

Before coding, read:
- tasks/todo.md
- tasks/lessons.md
- tasks/ux-overhaul-plan.md
- docs/next-session-handoff.md
- docs/devops-postgres.md

Context:
- Trainer model is being changed from:
  - single `sport` + tiered trainer prices (`priceMorning/priceDay/priceEveningWeekend`)
  to:
  - multiple sports (`sports[]`)
  - one trainer price (`pricePerHour`)
- Admin trainers page was partially refactored to edit description + sports + single price
- Trainer schedule page was partially extended to show session history
- Coaches page was switched toward DB-backed trainer cards (description should come from DB)
- Booking availability/persistence/booking UI were partially patched for multi-sport + single trainer price
- New manual migration SQL exists:
  `prisma/migrations/20260224123000_instructor_multi_sport_single_price/migration.sql`
- Prisma `generate` succeeded in the prior session after stopping local Next.js dev processes.

Important blockers hit in the prior session:
1) `npx prisma migrate dev ...` failed because Prisma tried to download `schema-engine` (network blocked in sandbox)
2) `npm run db:seed` failed in sandbox with `tsx/esbuild` `spawn EPERM`
3) Migration SQL was applied directly to local Postgres with:
   `docker exec ... psql` (successful), but full verification was NOT completed

Required tasks:
1) verify/complete the trainer refactor end-to-end:
   - Prisma schema matches runtime code
   - migration SQL is correct and idempotent enough for local reset flow
   - seed file works and is easy to edit with real live data later
2) patch any remaining compile/runtime breaks (admin/resources, coaches, booking flow, hidden `/prices`, tests)
3) verify trainer UX requirements:
   - trainer has one price only
   - trainer can have multiple sports
   - admin can edit trainer description
   - coaches page shows trainer description from DB
   - admin shows trainer session history
4) update `tasks/todo.md` and tick `tasks/ux-overhaul-plan.md` checkboxes as work is completed
5) run verification and summarize exact results:
   - `npx prisma generate`
   - `npm run db:seed`
   - `npm run lint`
   - `npm run test:unit`
   - `npm run build`
   - (if trainer flow touched in UI behavior) `npm run test:e2e`

Keep current booking rules intact:
- auth required for booking
- fixed 60-minute hour slots
- court base pricing uses morning + evening/weekend (weekday daytime court uses morning price)
- trainer price is trainer-specific and should NOT appear in admin base pricing matrix
```

## Quick Context Snapshot

- Stack: Next.js 16 App Router, Prisma, Postgres (Docker), Auth.js Credentials, Vitest, Playwright
- Locale: Kazakhstan, `KZT`, `Asia/Almaty`, Russian UI
- Homepage: user-requested DB-driven layout (hero, compact court-only prices, placeholders, about club, socials)
- Public nav/footer: auth-aware portal link and no surfaced `Корты` / `Цены`
- Booking UX: `sport -> service -> date -> per-court hour slots`, trainer selection for training, account-first flow

## Useful Recovery Commands

```powershell
docker compose ps
Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" | Select-Object ProcessId, CommandLine | Format-List
npx prisma generate
npm run db:seed
npm run lint
npm run build
```
