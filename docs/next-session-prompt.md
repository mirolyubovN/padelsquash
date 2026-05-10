# Next Session Prompt (Copy/Paste)

Use the following prompt to start the next implementation session. Features 1 and 2 are implemented; continue with Feature 3.

```text
We are in D:\Websites\padelsquash.

Read these first (in order):
- README.md
- tasks/lessons.md
- tasks/todo.md
- tasks/feature-promo-codes.md
- prisma/schema.prisma

Current state:
- Stack: Next.js 16 App Router, React 19, TypeScript, Prisma 6, PostgreSQL Docker (127.0.0.1:55432), Auth.js Credentials, Russian UI, KZT, Asia/Almaty.
- Feature 1, user role management, has been built:
  - `User.active` migration `20260601002000_user_active_flag`.
  - `/admin/staff` for super-admin staff CRUD.
  - Staff activation links reuse `/activate-account`.
  - Admin/super_admin/trainer creation, password reset, active toggle, admin role toggle, trainer instructor linking, inline trainer-card creation, and staff audit logging.
  - Auth and guarded routes reject inactive users with `account_disabled`.
  - README and route docs include `/admin/staff`.
- Feature 2, trainer Telegram notifications, has been built:
  - Common operations chat settings at `/admin/settings/telegram`.
  - Trainer DM subscription management at `/trainer/notifications`.
  - Polling bot commands for `/start trainer_<token>`, `/registerchat <secret>`, `/getchatid`, and existing customer contact verification.
  - Booking create/cancel notifications go to common chat and horizon-gated trainer DMs.
  - Club event registrations/cancellations and full event cancellations notify common chat and the assigned trainer when the event has an instructor.
  - Daily digest includes tomorrow's bookings and trainer-associated events, grouped by trainer, with `POST /api/cron/daily-digest` as a bearer-protected trigger.

Recommended implementation order:

1. **Promo codes** — `tasks/feature-promo-codes.md`
   New promo models, pricing-engine hook, admin CRUD at `/admin/promo-codes`, customer/admin apply UI, transactional redemption, and audit logging.

Rules for each feature:
- Write/update `tasks/todo.md` before implementation and track progress there.
- Read local `.next-docs` before any Next.js work.
- Russian-only UI strings.
- Stop the dev server before `npx prisma generate` on Windows if Prisma DLL files are locked.
- Do not skip hooks (`--no-verify`) on commits.
- After each feature ships: update README routes table + Known Gaps, and remove the corresponding entry from Upcoming Features.

Verification before declaring a feature done:
- `npx prisma format && npx prisma generate && npx prisma migrate deploy`
- `npm run lint`
- `npm run build`
- Targeted unit/integration tests added by the feature pass.
- Manual browser smoke for any UI-touching change.

Start with promo codes. Read its spec end-to-end, then plan in `tasks/todo.md` before editing.
```
