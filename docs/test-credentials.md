# Test Credentials

Last verified: 2026-03-08 (after registration verification + notifications update).

Use these accounts to test each user type in the app.

| User type | Login URL | Email | Password | Notes |
| --- | --- | --- | --- | --- |
| `super_admin` | `/login?next=%2Fadmin` | `admin@example.com` | `Admin123!` | Full admin access, including sports/pricing and wallet bonus settings. |
| `admin` | `/login?next=%2Fadmin` | `manager@example.com` | `Manager123!` | Operational admin with wallet adjustments, customer creation, and booking management. |
| `trainer` | `/login?next=%2Ftrainer%2Fschedule` | `trainer@example.com` | `Trainer123!` | Can edit only own timetable and own exceptions. |
| `customer` | `/login?next=%2Faccount` | `customer@example.com` | `Customer123!` | Standard client account for booking and wallet flow tests. |

## Notes

- These values come from `prisma/seed.ts` unless overridden by seed env vars.
- `npm run db:seed` resets the local database to this state.
- Seeded users are created as already verified (`emailVerifiedAt` + `phoneVerifiedAt`) so role testing is not blocked by the new registration confirmation flow.
- Admin-created customers use `/activate-account` instead of these seeded credentials.

## Testing Registration Verification

Use a new email that does not exist in seed data:

1. Open `/register`.
2. Submit name/email/phone/password.
3. Confirm the app redirects to `/register/verify`.
4. Complete email verification via `/verify/email` link from SMTP mailbox.
5. Complete phone verification via Telegram bot link and contact share.
6. Confirm login succeeds only after both confirmations are complete.
