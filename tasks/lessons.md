# Lessons

- When the user changes geography/market assumptions, update all related defaults together immediately: timezone, currency code, locale formatting, seed pricing, and file/module names that encode the old location.
- Keep demo/hardcoded values centralized in one source file and avoid fake per-item uniqueness when the real product treats items as identical (e.g., same-spec courts by sport).
- Default to the simplest pricing model that matches the business: fixed matrices beat generic rule engines unless the user explicitly needs rule composition.
- Business policy windows (e.g., cancellation cutoff) should be configurable and centralized; do not hardcode assumptions like "24h" in multiple files.
- When the user wants end-to-end testing, prioritize shipping the visible interactive UI path (not only backend/admin readiness) before claiming the flow is ready to test.
- Slot generation granularity must match the booking product model; fixed 60-minute sessions should default to hour-based starts, not 15-minute rolling starts.
- Pricing assumptions can vary at resource level (e.g., trainer-specific prices); verify whether prices are global per sport or per individual resource before locking the schema/UI.
- For NextAuth e2e tests, keep Playwright `baseURL` aligned with `NEXTAUTH_URL` host (`localhost` vs `127.0.0.1`) to avoid session/cookie login failures that look like bad credentials.
- PostgreSQL advisory lock calls (`pg_advisory_xact_lock`) should use Prisma `$executeRaw`, not `$queryRaw`, because the function returns `void` and Prisma cannot deserialize it.
- Public website copy must stay customer-facing; keep technical/testing/internal architecture language out of marketing pages and centralize all public content in a dedicated content module.
- DB-backed concurrency tests can expose serializable write-conflict/deadlock paths outside the final business validation path; add bounded retries where the transaction can be safely retried.
- In booking UX, account/auth should be a first-class step (not just raw customer inputs): unauthenticated users need clear login/registration actions, and authenticated users should see a concise summary with optional editing.
- Public navigation shortcuts (header/footer) must be auth-aware: guests should see login/registration entry points, customers should see account, and admins should see admin panel instead of generic account links.
- When the user replaces a design direction after a phase implementation, treat it as a product-spec override (not an incremental tweak): update the master plan checklist immediately and remove superseded homepage sections instead of layering new sections on top.
- Pricing ownership must be explicit before building admin/public pricing UX: court base prices and trainer-specific prices are different sources, and admin base pricing must not duplicate trainer pricing controls.
- Before adding admin UX on top of a resource, confirm the underlying domain cardinality (single vs multi-sport trainer, single vs tiered trainer price) and migrate the schema first; UI patches on a wrong model create cascading rework.
