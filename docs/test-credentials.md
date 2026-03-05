# Test Credentials

Last verified: 2026-03-05 (after `npm run db:seed`).

Use these accounts to test each user type in the app.

| User type | Login URL | Email | Password | Notes |
| --- | --- | --- | --- | --- |
| `super_admin` | `/login?next=%2Fadmin` | `admin@example.com` | `Admin123!` | Full access, including prices/sports and revenue. |
| `admin` | `/login?next=%2Fadmin` | `admin+ops@example.com` | `Admin123!` | Operational admin; no prices/sports editing and no revenue fields. |
| `trainer` | `/login?next=%2Ftrainer%2Fschedule` | `trainer@example.com` | `Trainer123!` | Can edit only own timetable and own exceptions. |
| `customer` | `/login?next=%2Faccount` | `customer@example.com` | `Customer123!` | Standard client account for booking flow tests. |

## Notes

- These values come from `prisma/seed.ts`.
- If you override seed env vars, credentials may differ.
- To reset back to this state, run:

```bash
npm run db:seed
```
