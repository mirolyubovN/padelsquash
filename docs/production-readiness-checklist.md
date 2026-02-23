# Production Readiness Checklist

This checklist is tailored to the current architecture of `Padel & Squash KZ`:

- Next.js App Router
- Prisma + PostgreSQL
- Auth.js (Credentials)
- booking/availability APIs
- admin panel + customer account
- placeholder payments (real provider integration pending)

Use this document as a working release gate. Do not mark the app “production-ready” until the critical sections are complete.

## How to Use This Checklist

- Treat `Critical` items as blockers for launch.
- Treat `Recommended` items as launch-quality requirements unless explicitly deferred.
- Record decisions for deferred items in a release note / risk register.

## 1. Product Scope Freeze (Critical)

- [ ] Finalize MVP scope for launch (what is in, what is explicitly out)
- [ ] Confirm booking policies with owner:
  - [ ] session duration (currently fixed 60m)
  - [ ] slot granularity (currently hourly)
  - [ ] cancellation cutoff (currently 6h)
  - [ ] no-show policy
  - [ ] refund policy and timing
- [ ] Confirm payment providers for launch (Kaspi / Freedom / manual)
- [ ] Confirm languages for launch (currently Russian-only)

## 2. Environment & Deployment (Critical)

- [ ] Choose production hosting target (VPS / cloud / PaaS)
- [ ] Configure production `NEXTAUTH_URL`
- [ ] Configure strong `NEXTAUTH_SECRET` (not default)
- [ ] Configure production `DATABASE_URL` (managed Postgres or hardened self-hosted)
- [ ] Separate environments:
  - [ ] development
  - [ ] staging
  - [ ] production
- [ ] Store secrets in secret manager / hosting env vars (not in repo)
- [ ] Configure process manager / service supervision (if self-hosted)
- [ ] Configure HTTPS/TLS termination
- [ ] Validate timezone and locale in production (`Asia/Almaty`, `ru-KZ`)

## 3. Database & Prisma (Critical)

- [ ] Production PostgreSQL instance provisioned
- [ ] Backups configured (automated)
- [ ] Restore procedure tested at least once
- [ ] Prisma migration workflow defined for deploys
- [ ] Migrations run in staging before production
- [ ] No destructive migration risk left unreviewed
- [ ] DB connection pooling strategy reviewed (especially if serverless)
- [ ] Least-privilege runtime DB user configured (separate from admin/migration user)
- [ ] Data retention policy defined (bookings, payments, audit logs)

## 4. Authentication & Authorization (Critical)

- [ ] Enforce strong password requirements (review current minimums)
- [ ] Rate limiting on auth endpoints (`/login`, `/register`)
- [ ] Brute-force protection / lockout strategy
- [ ] Session expiration policy reviewed and documented
- [ ] RBAC coverage audit completed for all admin routes and actions
- [ ] Customer-only actions verified to use session user ID (not request payload user IDs)
- [ ] Admin actions reviewed for authorization checks (`assertAdmin`)
- [ ] Unauthorized/forbidden UX is clear and non-leaky

## 5. Booking Integrity & Business Rules (Critical)

- [ ] Double-booking protection verified under concurrency/load
- [ ] Booking overlap logic tested with:
  - [ ] same court
  - [ ] same trainer
  - [ ] edge times (back-to-back)
- [ ] Availability and booking use the same slot policy (hourly starts)
- [ ] Booking persistence errors surface to client (no silent fake success)
- [ ] `ALLOW_DEMO_FALLBACK=false` in production
- [ ] Court rental auth requirement verified (UI + API)
- [ ] Trainer selection required for training bookings (UI + API)
- [ ] Trainer-specific pricing verified against selected trainer
- [ ] Price preview equals final saved booking price
- [ ] Cancellation cutoff enforcement verified (6h config)
- [ ] Cancellation changes booking and payment statuses correctly

## 6. Payments (Critical for Online Payments Launch)

If launching with real online payments:

- [ ] Real provider integration implemented (Kaspi / Freedom)
- [ ] Payment creation request signed/authenticated as required
- [ ] Webhook endpoint(s) implemented
- [ ] Webhook signature verification implemented
- [ ] Webhook idempotency implemented
- [ ] Payment status mapping documented and tested
- [ ] Refund API integration implemented (if supported)
- [ ] Refund status sync/webhooks handled
- [ ] Payment reconciliation process defined (manual/admin fallback)
- [ ] Admin tooling for payment troubleshooting available

If launching with manual payment only:

- [ ] Disable/omit online payment UI paths cleanly
- [ ] Admin process for confirming payments documented
- [ ] Customer communication flow defined

## 7. Security Hardening (Critical)

- [ ] Review input validation on all public and admin APIs (Zod coverage)
- [ ] Review CSRF exposure for server actions / auth flows
- [ ] Add rate limiting for:
  - [ ] auth endpoints
  - [ ] booking creation endpoint
  - [ ] availability endpoint (optional but recommended)
- [ ] Add request logging for security-sensitive actions
- [ ] Add admin audit logging (who changed what and when)
- [ ] Review error messages for information leakage
- [ ] Ensure no dev/test secrets remain in env/config
- [ ] Ensure `trustHost` and proxy headers are correct for deployment topology

## 8. Observability & Operations (Recommended)

- [ ] Structured application logs (JSON or standardized format)
- [ ] Error tracking (e.g., Sentry) configured
- [ ] Alerting for critical failures:
  - [ ] booking API failures
  - [ ] payment webhook failures
  - [ ] DB connectivity issues
- [ ] Health endpoint / health check strategy
- [ ] Uptime monitoring
- [ ] Log retention policy
- [ ] Operational runbook for incidents

## 9. Testing & QA (Critical)

- [ ] Automated test strategy in place
- [ ] CI pipeline runs at minimum:
  - [ ] `npm run lint`
  - [ ] `npm run build`
  - [ ] tests
- [ ] Unit tests for:
  - [ ] pricing tier resolution
  - [ ] trainer-specific pricing totals
  - [ ] cancellation policy cutoff
  - [ ] slot generation alignment to hour
- [ ] Integration tests for:
  - [ ] booking API overlap conflicts
  - [ ] booking persistence + payment row behavior
  - [ ] customer cancellation refund state update
- [ ] E2E tests (Playwright recommended):
  - [ ] register -> login -> court booking -> slot disappears
  - [ ] training booking with trainer selection and different prices
  - [ ] account cancellation within allowed window
  - [ ] admin changes trainer price -> booking preview reflects change
- [ ] Manual QA checklist executed on staging

## 10. Admin UX & Data Operations (Recommended)

- [ ] Inline validation/error messaging for admin forms
- [ ] Confirm admin can manage:
  - [ ] opening hours
  - [ ] court prices
  - [ ] trainer prices
  - [ ] courts
  - [ ] instructors
  - [ ] services
  - [ ] schedules
  - [ ] exceptions
- [ ] Admin audit trail for price/policy changes
- [ ] Safe rollback procedure for accidental pricing updates

## 11. Content, Legal, and Customer Communication (Recommended)

- [ ] Terms of service / booking terms
- [ ] Privacy policy
- [ ] Cancellation/refund policy page matches implemented rules
- [ ] Contact information and support process finalized
- [ ] Payment disclaimers and confirmation messaging reviewed
- [ ] Email/SMS confirmation strategy defined (if applicable)

## 12. Performance & Reliability (Recommended)

- [ ] Measure availability endpoint latency under realistic load
- [ ] Measure booking API latency and conflict handling under concurrent requests
- [ ] Review DB indexes using real query patterns
- [ ] Cache strategy reviewed (where safe)
- [ ] Confirm no unnecessary dynamic rendering on static pages
- [ ] Test app under poor network conditions (mobile UX)

## 13. Release Preparation (Critical)

- [ ] Version/tag release candidate
- [ ] Create deployment checklist for release day
- [ ] Staging sign-off completed
- [ ] Production migration plan approved
- [ ] Rollback plan prepared
- [ ] Post-release monitoring window assigned
- [ ] Owner sign-off recorded

## 14. Current Known Gaps (As of This Document)

These are known blockers/gaps relative to “production-ready”:

- [ ] Real payment provider integration + webhooks
- [ ] Real provider refund implementation (currently DB status only)
- [ ] Automated tests + CI
- [ ] Security hardening (rate limiting, audit logs)
- [ ] Production deployment runbook / infrastructure docs
- [ ] Broader admin editing UX polish and validation feedback

## Suggested Release Gate Definition

Do not launch publicly until:

- all `Critical` items are complete
- all payment items for the chosen payment mode are complete
- staging QA passes end-to-end booking/account/admin scenarios
- backups and restore are verified
- monitoring and error alerts are active

