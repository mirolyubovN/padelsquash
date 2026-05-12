# Lessons

- When implementing trainer notification features, include every paid/trainer-associated activity type in the notification surface, not only `Booking` rows; club events with `instructorId` must appear in common chat and trainer digests/DMs.
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
- When the user says the app/admin is overcomplicated, prioritize scope reduction first: hide non-essential sections by role and remove financial controls from operational roles before adding new features.
- When multiple agents are working in the same repo, treat unrelated modified files as off-limits unless the user explicitly clears them; isolate your fix to unaffected files and verify around that boundary.
- For admin financial workflows, do not stop at raw adjustment primitives; ship a usable operator flow with customer discovery/creation, and ensure admin deep-links (calendar -> create booking) preserve context and block impossible actions like past-time booking.
- When a domain entity like sport is user-configurable, its setup must be centralized in one admin surface; forcing the operator to repeat the same concept across separate tabs is a product-model failure, not just a missing convenience.
- When suggesting follow-up work, avoid inventing business logic the product owner has not asked for; if a status like `no_show` already means "no refund", preserve that simple rule unless explicitly told otherwise.
- Do not trust terminal mojibake as harmless display noise when editing copy-heavy pages; if the source file contains sequences like `РЎ`/`Рџ`, treat it as a real UTF-8 corruption issue and repair the literals before continuing feature work.
- When repairing encoding issues on Windows, verify file bytes with a UTF-8-safe reader (`node`/`fs`) before and after edits; PowerShell output can look corrupted even when the file is correct, and DB-backed mojibake may require a separate in-place data fix.
- When a frontend issue presents as "no styles", verify the actual global stylesheet entry path before changing bundlers or broader tooling; missing or split style imports can be a simpler root cause than the compiler itself.
- When the user calls out missing admin UX after a targeted fix, widen the pass from isolated bug work to operator workflow review, and add direct navigation paths (one-click handoff to related records) instead of only backend capability changes.
- For dense admin list pages, default per-row management actions to modal workflows instead of expanding long inline sections; preserve quick context and avoid forcing scroll jumps.
- For audit and wallet ledger writes with optional actor foreign keys, validate actor existence before insert and fall back to `null` when the actor ID is stale (for example after reseed or user recreation).
- When users ask to “make admin flow the same as customer flow,” do not stop at backend parity; match the actual UI patterns (pricing visibility, step structure, and controls) and keep search affordances operator-friendly (name/phone first).
- In Russian customer search UX, normalize `е/ё` variants in search APIs and protect result selection from input blur side effects so one click reliably applies the client.
- When fixing search quality in one admin screen, sweep every other customer-search entry point in the same release (wallet list, booking list, create-booking autocomplete) and reuse one shared normalizer.
- When admin flow selects an existing customer, lock identity fields in booking forms and require edits through dedicated customer-management surfaces (wallet/profile), not inline booking edits.
- Customer account routes must explicitly guard by role; admin/super-admin users should be redirected to admin portals instead of rendering customer account pages.
- When a user says a booking/payment fix is getting overcomplicated, stop expanding the domain model and keep the correction inside the existing per-booking flow unless they explicitly ask for a new aggregate entity.
- When fixing human-readable labels in admin UI, do not leave visible `?? id` fallbacks in place; pass the canonical resource ID alongside the display map and fall back to a neutral label, not the raw GUID.
- When an admin total combines multiple billable components, render each component in the list UI and keep row actions behind one manage entry; operators need readable pricing context and audit history more than a wall of buttons.
- Do not apply a new palette globally on first pass when the user asks for design exploration; create side-by-side preview variants first, and validate contrast/readability before promoting any palette to the main theme.
- When the user gives an exact design token set after a contrast complaint, apply those tokens verbatim to global variables first and then adjust component accents around them; do not improvise alternate base colors.
- When the user asks to propagate a selected palette site-wide, explicitly include admin surfaces in the same pass; public-only theming is incomplete.
- When the user provides exact source URLs for page copy, rewrite from those sources directly (short paraphrase) and update visible source links to match.
- For UI controls that change derived state windows (for example date pagination), do not keep a broad auto-sync effect that always snaps window state back from selected value; either move the selected value with the window or gate sync to out-of-window cases.
- For booking/action blocks with conditional links, wrap message+link in an explicit vertical container and set link display/line-height explicitly; relying on default inline flow can cause overlap under long localized text.
- For booking confirmation states, avoid rendering pre-submit shortage hints together with post-submit insufficient-funds errors; once an actionable error is shown, suppress duplicate informational banners and keep alert blocks width-constrained.
- When booking status/info chips still consume too much height, consolidate them into one flex row-wrap container and keep each message as a compact item instead of stacking full-width blocks.
- In multi-slot booking flows with temporary holds, never strip `holdId` from already selected cells during UI toggles; preserving hold IDs is required to keep reserved slots selectable/visible after top-up return.
- For multi-slot customer bookings, enforce a strict pre-submit wallet check against the full selected series total regardless of hold state; do not allow partial per-slot booking creation when total funds are insufficient.
- For instructor-backed bookings, treat the instructor as a scarce resource across all selected courts: prevent duplicate same-time selections in the UI and enforce the same rule in every backend path.
- Booking availability rules must be enforced in mutation paths, not only in the availability/read API; direct booking and reschedule actions need the same opening-hours, exception, schedule, hold, and resource checks.
- On account pages, avoid relying on inherited form/button spacing: add explicit action-row wrappers and self-contained hint/subsection spacing so buttons and badges do not visually stick to adjacent text.
- For account booking history polish requests, implement exact class-targeted spacing fixes (for example a single badge modifier) and only then broaden layout changes like responsive multi-column lists.
- When a preview design is criticized for visual quality, do not keep iterating surface styling first if the user identifies missing infrastructure; pivot to the underlying capability, such as media/gallery management, then revisit the design with real assets.
- On Windows, never request stopping all `node.exe` processes to unlock Prisma; that can kill the active session or the user's dev server. Identify the exact locking process first, or ask the user to stop `next dev` manually.
- Event/admin forms should expose concrete scheduling resources the operator must control (sport, courts, capacity, price) instead of vague internal categories like `type`; keep internal defaults hidden unless the user explicitly asks for taxonomy.
- When redirecting back to a filtered admin list after an operation, ensure the redirected value is supported by that list's search fields; if redirecting with email, the search must match email and the placeholder must say so.
- Customer "my bookings" views must include every customer-reserved paid activity, not just court bookings; when adding bookable events or classes, wire them into account history, dashboard counts, and cancellation/refund actions in the same pass.
- Availability UIs should distinguish "no operating time" from "fully occupied"; do not filter out fully booked/event-blocked time rows, render them as disabled cells so users understand why a time cannot be selected.
- For uploaded public assets, do not use native `type="url"` inputs when the app stores relative `/uploads/...` paths; use text input plus preview/selection UX, and make uploaded media selectable wherever the same field references media assets.
- When media belongs to a domain entity with multiple photos, add an explicit ordered relation instead of inferring ownership from global media categories; categories describe usage pools, not entity attachment.
- Registration verification UX should keep pending users in an authenticated session after a valid password; route them through verification guards and auto-forward to the requested account page after both confirmations instead of forcing a second login.
- On verification pages, keep verified contact values read-only by default; expose correction forms only behind an explicit edit action and show clear per-channel confirmed/pending status messages.
- Auth pages should centralize repeated panel chrome and keep CTAs state-specific. Do not duplicate registration/login links or add generic home links inside focused auth and verification flows.
- Account contact changes are not normal profile edits. Store new email/phone as pending values, block customer account access until confirmation completes, confirm email with a short code, and confirm phone through the Telegram contact flow before replacing the canonical contact.

## Lesson 2026-05-05 - recurring event UX

- When grouping recurring events publicly, do not simply nest all generated instances with repeated CTAs. The correct UX is one main event card, a date selector, selected-date availability, and one action for the selected concrete occurrence.

## Lesson 2026-05-05 - recurring event modal selection

- Public recurring event cards should not expose aggregate date counts or total free-place counts. Keep the card focused on the event, then open a modal where the user selects a concrete date and sees that date's availability/action.

## Lesson 2026-05-05 - fixed modals inside transformed cards

- Do not render `position: fixed` modals inside elements that can receive `transform` (for example hover-lift cards). A transformed ancestor becomes the fixed-position containing block and can make the modal jump or flicker; render the modal as a sibling/outside the transformed card or via a portal.

## Lesson 2026-05-05 - event trainer compatibility and blocking

- Event instructor assignment must be treated as a real resource reservation: validate instructor sport/location compatibility on create/edit, prevent overlapping event/booking/hold conflicts, and include assigned instructors in public/admin availability blockers.

## Lesson 2026-05-05 - optional admin client email

- When making admin-created customer email optional, do not make `User.email` nullable casually because auth, wallet, activation links, and search use it as a unique key. Generate an internal placeholder email and hide it in operator-facing UI where possible.

## Lesson 2026-05-12 - mobile drawer below sticky header

- When moving a mobile drawer below a sticky header, give the fixed overlay an explicit viewport-based height and remove duplicate drawer header chrome; otherwise the drawer can collapse to zero height and look like transparent content floating under a double header.

## Lesson 2026-05-12 - pricing period model

- The pricing model has only `off_peak` and `peak` periods. Do not reintroduce legacy `morning`, `day`, or `evening_weekend` values in seed data, UI options, or tests.

## Lesson 2026-05-12 - attendance statuses

- Do not expose a separate `no_show` booking workflow unless the business has a concrete no-show policy. Past confirmed bookings should close as `completed`, and legacy `no_show` rows should be treated as completed in visible UI.

## Lesson 2026-05-12 - trainer revenue share

- Revenue share is trainer-specific, not global. Store the percentage on the trainer and use the same percentage for training and events; event payouts must be based on trainer hourly rate times event duration, not total event registration revenue.
