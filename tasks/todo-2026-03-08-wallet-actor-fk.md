# Plan (2026-03-08 - admin wallet actor FK regression)

- [x] Reproduce and isolate the failing path that writes `WalletTransaction.actorUserId` during admin top-up.
- [x] Add a wallet-service-level safeguard so stale or invalid actor IDs do not break ledger writes.
- [x] Add regression coverage for wallet credit/debit with an invalid actor ID.
- [x] Run targeted verification and capture review notes.

## Review (2026-03-08 - admin wallet actor FK regression)

- Root cause confirmed: admin wallet adjustment used `actionSession.user.id` as ledger `actorUserId`, and stale session IDs (after reseed/user recreation) violated `WalletTransaction_actorUserId_fkey`.
- Implemented safeguard in `src/lib/wallet/service.ts`:
  - added `resolveWalletActorUserId(...)` to check actor existence in the current transaction;
  - ledger writes now store `actorUserId: null` when the provided actor ID does not exist.
- Added regression coverage in `tests/integration/wallet-service.test.ts`:
  - verifies credit/debit with a stale actor ID succeeds;
  - verifies both ledger rows persist with `actorUserId = null`;
  - verifies resulting customer balance remains correct.
- Verification:
  - `npm.cmd run test:integration -- tests/integration/wallet-service.test.ts` PASS (12/12 integration tests passed in this run).
