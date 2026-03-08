# Plan (2026-03-08 - super admin `/account` route safety)

- [x] Reproduce/report-trace super-admin visit to `/account`.
- [x] Prevent admin/super-admin users from rendering customer account screens.
- [x] Add regression coverage for admin redirects from `/account` and `/account/bookings`.
- [x] Run targeted verification and capture review notes.

## Review (2026-03-08 - super admin `/account` route safety)

- Added admin/super-admin redirect guards on customer account surfaces:
  - `app/account/page.tsx` now redirects admin roles to `/admin`.
  - `app/account/bookings/page.tsx` now redirects admin roles to `/admin/bookings`.
  - `app/account/actions.ts` now redirects admin role action calls to `/admin` or `/admin/wallet`.
- Added focused e2e regression:
  - `tests/e2e/15-super-admin-account-page.spec.ts` verifies super-admin is redirected from `/account` and `/account/bookings` to admin routes and no app error is shown.
- Verification:
  - `npx.cmd eslint app/account/page.tsx app/account/bookings/page.tsx app/account/actions.ts tests/e2e/15-super-admin-account-page.spec.ts` PASS.
  - `npx.cmd tsc --noEmit` PASS.
  - `npx.cmd playwright test tests/e2e/15-super-admin-account-page.spec.ts` PASS.
