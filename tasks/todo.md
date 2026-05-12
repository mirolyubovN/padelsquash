# Session Todo (2026-05-12 - statuses and earnings model)

## Plan

- [x] Remove `no_show` from operator/customer/trainer UI and status actions.
- [x] Remove `no_show` from Prisma schema/database enum, converting legacy rows to `completed`.
- [x] Add automatic completion for past confirmed bookings before booking/earnings dashboards read data.
- [x] Replace trainer earnings calculation with a revenue split model:
  - court component: 100% club
  - instructor/training component: configurable trainer share, default 90%
  - events: trainer hourly rate * duration hours * configurable trainer share, default 90%
- [x] Move configurable revenue share from a global setting to each trainer profile.
- [x] Remove the global revenue-share settings surface and database table.
- [x] Keep event trainer payouts based on trainer hourly rate x duration x trainer percentage, not event revenue.
- [x] Add/adjust dashboard summaries for superadmins and trainers.
- [x] Verify with migrations, Prisma generate, targeted tests, lint, and build.

## Review

- Removed the `no_show` workflow from visible admin/customer/trainer surfaces and removed it from the Prisma schema enum.
- Added migration `20260512000200_remove_no_show_booking_status` to convert legacy `no_show` rows to `completed` and recreate the PostgreSQL enum without `no_show`.
- Added `completePastConfirmedBookings()` and wired it into account/admin booking reads, calendars, dashboard, and trainer earnings so past confirmed bookings become `completed` automatically when dashboards/lists are opened.
- Correction applied: revenue share is now configured per trainer via `Instructor.revenueSharePercent`, defaulting to 90%.
- Removed the global revenue-share settings UI/service and added migration `20260512000300_trainer_revenue_share` to add the trainer field and drop the old global table.
- Updated trainer earnings to separate gross, trainer payout, and club share. Court component stays with the club; event trainer payout is trainer hourly rate x duration x trainer percent.
- Updated superadmin dashboard with weekly gross, club revenue, and trainer payout.
- Fixed the dashboard week summary end date so it uses Monday-Sunday, not Monday-next-Monday.
- Verification: applied migrations, regenerated Prisma client, `npm run lint` passed with existing warnings only, `npm run build` passed, and integration tests passed after `npm run db:seed`.
