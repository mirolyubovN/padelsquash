# CMS decision: stay on the current stack

**Date:** 2026-05-04
**Decision:** Do not introduce a CMS. Keep Next.js + Prisma + Postgres as the single source of truth. Close the small editable-copy gap with a lightweight in-app `SiteContent` table when (and only when) non-developer admins actually need to edit marketing strings.

---

## Context

The product is a **transactional booking platform**, not a content site:

- Wallet ledger with bonus rules and refund flows
- Booking holds + top-up resume to prevent double-booking under concurrent writes
- Multi-slot, multi-court allocation
- Recurring `ClubEventSeries` → editable `ClubEvent` instances with capacity, refunds, CSV export
- Per-instructor, per-sport, per-week schedule overrides
- Cancellation policy windows (morning vs other slots, configurable hours)
- Audit log on booking actions

Domain logic lives in `src/lib/{bookings,wallet,availability,events,admin}` (~hundreds of files). `prisma/schema.prisma` is 612 lines. `src/lib/admin/resources.ts` alone is 1,904 lines of CRUD/validation. **None of this is what a CMS does.** Forcing it into a CMS would split the source of truth and add a second runtime to operate.

## What the admin already manages (CMS-equivalent surface)

| Entity | Admin route |
| --- | --- |
| `Sport`, `Court`, `Instructor`, `InstructorPhoto`, `InstructorSport` | `/admin/sports`, `/admin/courts`, `/admin/instructors` |
| `ResourceSchedule` (weekly + per-week overrides), `OpeningHour`, `ScheduleException` | `/admin/instructors/[id]/schedule`, `/admin/opening-hours`, `/admin/exceptions` |
| `ComponentPrice`, `WalletBonusConfig` | `/admin/pricing/*`, `/admin/wallet` |
| `ClubEventSeries`, `ClubEvent`, `EventRegistration` | `/admin/events` |
| `MediaAsset` (categories: `homepage`, `gallery`, `instructors`, `events`, `offers`) | `/admin/media` |

## What is hardcoded today

Two files, ~400 lines of Russian marketing copy:

- `src/lib/content/site-content.ts` — site config, nav, hero copy, FAQ, club rules, contact card text (250 lines)
- `src/lib/content/sport-pages.ts` — padel/squash/tennis info pages (143 lines)

That is the entire "CMS gap."

## Why a CMS is not justified

| Common CMS trigger | Status here |
| --- | --- |
| Multiple languages | Russian-only |
| Multiple venues with separate marketing pages | Single Almaty location |
| Frequent blog/news cadence | No blog |
| Marketing team needing daily edits | Not in scope |
| Multi-tenant (managing many clubs) | Single club |

A CMS would add: a second runtime/deploy, a second auth domain, a second source of truth, and a sync surface against the booking domain — for ~400 lines of copy that change rarely.

## Recommended path forward

### Now
Continue editing copy in `src/lib/content/site-content.ts` and `sport-pages.ts`. Acceptable while the redesign is in flight and copy is still being tuned.

### Next (when admins need to edit copy themselves)
Add a thin `SiteContent` table with `key` (e.g. `homepage_hero`, `faq`, `club_rules`, `sport_padel`) → JSON value, and an `/admin/content` editor that reuses the existing modal/form patterns from `src/lib/admin/resources.ts`. Estimated cost: ~1 day. Reads cached per-key.

### Later (only if any of these happen)
- Add a second locale → reconsider
- Add a real blog with frequent posts → reconsider
- Onboard a marketing team that needs visual page-building → reconsider

### If a CMS is ever picked
Use **Payload CMS** — same Postgres, TS-native, can live in this repo as an additional admin surface without a second runtime. Do not use WordPress/Sanity/Strapi: each adds an external system that the booking domain must reconcile against.

## Caveats flagged during the review

- `app/page.tsx` re-exports `page-variation-a`; `page-variation-b` and `app/preview/citysquash-style/` exist in parallel. The redesign is mid-flight (confirmed in README "Known Gaps"). Resolve the redesign before any CMS work — modeling content for pages that are about to be replaced is wasted effort.
- README "Known Gaps" lists higher-leverage items than a CMS: real payment provider (Kaspi/Freedom), monitoring/alerts/backups, CI/deploy docs.
