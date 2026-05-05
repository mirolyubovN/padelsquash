# Next Session Prompt - 2026-05-04

```text
We are in D:\Websites\padelsquash.

Read these first:
- AGENTS.md
- README.md
- tasks/lessons.md
- tasks/todo.md
- tasks/next-session-prompt-2026-05-04.md
- prisma/schema.prisma

Current state:
- Stack: Next.js 16 App Router, React 19, TypeScript, Prisma 6, PostgreSQL Docker, Auth.js Credentials, Russian UI, KZT.
- The repo has many uncommitted changes from the 2026-05-04 feature session. Do not revert unrelated files.
- Local Postgres is expected at `127.0.0.1:55432`.
- The Next dev server was stopped to unlock Prisma's generated DLL. Restart it before browser/manual testing.

Major work completed on 2026-05-04:
1. Events
   - Added event models: `ClubEventSeries`, `ClubEvent`, `EventRegistration`, `ClubEventCourt`.
   - Added wallet transaction types for event charges/refunds.
   - Added `/admin/events` for one-off and weekly recurring event creation.
   - Sport is required for events.
   - Event creation/edit requires selecting one or more courts for the selected sport/location.
   - Event court assignments block court availability and direct booking mutation conflicts.
   - Generated recurring instances can be edited individually.
   - Public `/events` lets customers book published events with wallet balance.
   - Customers can cancel event bookings from `/events` and `/account/bookings` with refund when applicable.
   - Admins can cancel a single participant with refund or cancel a whole event with full refunds to confirmed participants.
   - Admin participant list and CSV export route exist at `/admin/events/[eventId]/participants.csv`.

2. Booking visibility
   - Fully occupied time rows now remain visible in public/admin booking grids.
   - Event-blocked courts show as disabled/occupied cells instead of disappearing.
   - `/book` passes full court metadata to the booking form so all selected sport/location courts render in the grid.

3. Admin/customer bug fixes
   - Customer search now supports email in clients/search/autocomplete contexts.
   - Wallet top-up redirect with email query now resolves the customer.
   - Admin buttons use pointer cursor when enabled.
   - Create-event form has a confirmation step before submit.
   - Event create button contrast was fixed.

4. Media and public preview
   - Added `MediaAsset` model and `/admin/media` for super-admin media upload/library management.
   - Uploads save under `public/uploads/<category>` and create DB metadata.
   - Categories: `homepage`, `gallery`, `events`, `offers`, `instructors`.
   - `/preview/citysquash-style` uses uploaded media for homepage/gallery preview sections.
   - Global/public colors were simplified toward a white-first shell.

5. Trainer photos and galleries
   - `Instructor.photoUrl` remains the main trainer photo.
   - Added `InstructorPhoto` for ordered multiple photos per trainer.
   - Admin instructor create/edit forms now have:
     - `Главное фото`
     - `Галерея тренера`
   - Main photo and gallery can select active `instructors`/`gallery` media or use manual `/uploads/...`/remote URLs.
   - The main-photo input is `type="text"`, not `type="url"`, because local public assets use relative `/uploads/...` paths.
   - Public `/coaches` now renders larger photo-led trainer cards.
   - Clicking the main trainer photo opens a modal gallery with thumbnails and prev/next/keyboard navigation.

Applied migrations:
- `20260504120000_add_media_assets`
- `20260504130000_add_club_events`
- `20260504140000_add_event_courts`
- `20260504150000_add_instructor_photos`

Verification already run and passed:
- `npx prisma format`
- `npx prisma generate`
- `npx prisma migrate deploy`
- `npm run lint` passed with warnings only.
- `npm run build` passed.
- Targeted checks passed during the session:
  - media asset DB check
  - event DB/service check
  - event cancellation/refund/participant/edit check
  - event court blocking check
  - admin search check
  - event occupied slot visibility check
  - instructor relative photo path check
  - instructor gallery persistence check

Known warnings/gaps:
- Lint warnings remain for plain `<img>` usage in old preview pages, trainer photo preview, and `/preview/citysquash-style`.
- `app/trainer/schedule/page.tsx` still has an unrelated unused `todayIso` warning.
- Some admin validation strings in `src/lib/admin/resources.ts` contain mojibake and still need a dedicated encoding cleanup pass.
- `/preview/citysquash-style` is still a preview, not the production homepage.
- Dev server must be restarted after the Prisma DLL unlock stop.

Recommended next task:
Manual QA the new media/trainer/events paths and fix visible issues first:
1. Restart dev server with `npm run dev`.
2. Test `/admin/media` upload and category visibility as super-admin.
3. Test `/admin/instructors`:
   - upload/select main photo,
   - add multiple gallery photos,
   - save,
   - edit again and confirm gallery persists.
4. Test `/coaches`:
   - card main photo is large,
   - clicking opens modal,
   - thumbnails and next/prev work on desktop and mobile.
5. Test `/admin/events` and `/events`:
   - create event with sport/courts,
   - confirm occupied slots remain visible in `/book`,
   - book/cancel as customer,
   - cancel participant/event as admin.
6. If UI bugs are found, fix them narrowly and rerun `npm run lint` + `npm run build`.

Rules:
- Follow AGENTS.md: write/update `tasks/todo.md` before non-trivial implementation, verify before done, update `tasks/lessons.md` after user corrections.
- Do not use broad `Stop-Process node` or kill all Node processes. If Prisma generate is locked, identify exact process with `tasklist /m query_engine-windows.dll.node`.
- For Next.js work, read the local `.next-docs` docs before implementation.
- Keep UI text Russian-only.
- Do not revert unrelated dirty worktree changes.
```
