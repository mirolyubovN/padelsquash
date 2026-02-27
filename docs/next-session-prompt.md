# Next Session Prompt (Copy/Paste)

Use the following prompt to continue development in a new session.

```text
Continue development on D:\\Websites\\padelsquash.

First, read:
- tasks/todo.md
- tasks/lessons.md
- tasks/ux-overhaul-plan.md
- docs/next-session-handoff.md
- docs/devops-postgres.md

Current state (important):
- UX overhaul Phases 1-6 are complete.
- Phase 7 is mostly complete:
  - 7.1 password reset MVP page exists (`/forgot-password`)
  - 7.2 booking state persistence across auth is complete (including selected slot `time` query params)
  - 7.3 SEO/metadata is complete (OG/Twitter metadata, JSON-LD, robots, sitemap, unique metadata on all pages)
  - 7.4 accessibility foundations are complete (skip link, focus-visible, icon button labels)
- Remaining open Phase 7 items:
  1) full email-based password reset token flow
  2) WCAG AA color-contrast audit and fixes

Priority for next session:
1) Implement full password reset token flow (email-based reset)
2) Run a focused color-contrast audit and patch failing combinations
3) Keep all current booking/admin UX behavior intact
4) Update `tasks/todo.md` and `tasks/ux-overhaul-plan.md`
5) Run verification and report exact results

Important behavior to preserve:
- Auth required for booking
- 60-minute slots only
- Training flow is trainer-first, then date/time
- Multi-slot booking with auto-assigned court
- Booking state survives login/register via `/book` query params (`sport/service/date/instructor/time`)

Verification expectations (minimum):
- `npm run lint`
- `npm run build`
- `npm run test:e2e` (if booking/auth/admin UI touched)

Important local caveat:
- Run `npm run lint` separately from `npm run test:e2e` in this repo.
  Playwright and ESLint can race on `test-results/` if executed in parallel.
```

## Quick Context Snapshot

- Stack: Next.js 16 App Router, Prisma, Postgres (Docker), Auth.js Credentials, Vitest, Playwright
- Locale: Kazakhstan, `KZT`, `Asia/Almaty`, Russian UI
- Booking UX: progressive disclosure, trainer-first training flow, multi-slot selection, auto-court assignment
- Admin UX: sidebar + mobile drawer, breadcrumbs, dashboard stats, improved bookings filters/search/pagination, safer resource CRUD
- SEO: page metadata coverage complete, `robots.txt` + `sitemap.xml` generated, LocalBusiness JSON-LD in root layout

## Useful Recovery Commands

```powershell
docker compose ps
npx prisma generate
npm run db:seed
npm run lint
npm run build
npm run test:e2e
```
