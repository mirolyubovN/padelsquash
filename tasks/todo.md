# Session Todo (2026-05-12 - date/time locale normalization in UI)

## Plan

- [x] Inventory all admin/customer UI date/time inputs and formatting paths.
- [x] Set all UI `type="date"` and `type="time"` fields to Russian locale (`lang="ru-RU"`).
- [x] Enforce explicit 24-hour time formatting in UI date/time string rendering.
- [x] Run targeted verification for touched files.
- [x] Document review notes.

## Review

- Added explicit `lang="ru-RU"` to every detected UI `type="date"` and `type="time"` input across customer and admin flows (`/book`, admin bookings/calendar/events/promo/exceptions/opening hours, trainer schedule, and shared booking admin components).
- Enforced explicit 24-hour formatting in admin audit log time rendering by setting `hour12: false` in `toLocaleTimeString`.
- Verification: `npm run lint` passed with existing warnings only (mostly `<img>` optimization warnings and one pre-existing unused variable warning in admin create-booking form).

---

# Session Todo (2026-05-12 - booking timetable visibility)

## Plan

- [x] Review booking timetable and availability pipeline for hidden slots.
- [x] Update availability engine so hourly rows remain visible even when past/booked/trainer-unavailable.
- [x] Keep those rows non-selectable by returning empty availability for blocked rows.
- [x] Add unit tests for cutoff visibility and trainer-unavailable visibility.
- [x] Run targeted unit tests for availability engine.
- [x] Document verification results in review section.

## Review

- Updated `src/lib/availability/engine.ts` to always keep hourly rows inside opening hours; slots blocked by cutoff or venue exceptions are now returned with empty availability instead of being removed.
- For training services, slots where the selected instructor is unavailable are now still returned, but their `availableCourtIds` are cleared so the timetable shows them as disabled.
- Updated `tests/unit/availability-engine.test.ts` to verify:
- booked court overlap rows stay visible but unavailable
- training rows stay visible when instructor is unavailable
- cutoff-affected past rows stay visible but unavailable
- Updated `tests/integration/availability-api-route.test.ts` rental assertion to allow visible-but-unavailable rows (`availableCourtIds` may be empty).
- Verification: `npm run test:unit -- tests/unit/availability-engine.test.ts` passed (`9` test files / `46` tests passed due script targeting `tests/unit`).

---

# Session Todo (2026-05-11 - Russian UI string extraction)

## Plan

- [x] Inventory requested TS/TSX files and skip any missing files.
- [x] Create `src/lib/i18n.ts` and `src/messages/ru.json`.
- [x] Extract Russian UI strings from requested auth, account, trainer, booking, and admin files.
- [x] Preserve excluded strings: console logging, notification body copy, SEO metadata, comments, URLs, and CSS class names.
- [x] Replace extracted UI literals with typed `t("key")` calls, including interpolation where needed.
- [x] Run `npx tsc --noEmit` and fix type errors.
- [x] Run `npm run lint` and fix lint errors where practical.

## Review

- Added `src/lib/i18n.ts` and wired requested files to `t("...")`.
- `npx tsc --noEmit --incremental false --pretty false` passed. Plain `npx tsc --noEmit` hit local `EPERM` writing `tsconfig.tsbuildinfo`, so verification used `--incremental false`.
- `npm run lint` passed with existing warnings only (`<img>` warnings in public/preview pages and one unused `customerEmail` warning in `src/components/admin/create-booking-form.tsx`).
- Remaining Russian literals in target files are metadata, internal error strings/string matching, or comments.

---

# Session Todo (2026-05-12 - style colocation and shared.scss decomposition)

## Plan

- [x] Inventory current SCSS imports/usages and map shared blocks to owning components/templates.
- [x] Convert top-level shared UI components to folder-per-component structure (`component/component.tsx` + `component.scss`) and fix imports.
- [x] Split `src/styles/shared.scss` into colocated component SCSS files near owning templates/components.
- [x] Remove redundant preview/variation styles and any orphaned preview pages that only exist to support those removed styles.
- [x] Update global style entrypoint imports to new component-local SCSS paths.
- [x] Run verification (`npm run lint`) and document outcomes.

## Review

- Moved component TSX/SCSS into component folders for `site-header`, `site-footer`, `page-hero`, `faq-accordion`, `public-event-card`, and `coach-gallery-list` with folder-local `index.ts` exports.
- Moved former `src/styles` feature files into component-local locations (`src/components/{layout,home-page,booking,account,auth,admin}`) and moved the global SCSS entrypoint to `src/components/styles/index.scss`.
- Split `src/styles/shared.scss` into focused colocated files:
- `src/components/shared/page-layout/page-layout.scss`
- `src/components/shared/card-grid/card-grid.scss`
- `src/components/shared/rule-list/rule-list.scss`
- `src/components/contact/contact-page/contact-page.scss`
- `src/components/pricing/pricing-page/pricing-page.scss`
- `src/components/events/public-event-card/public-event-card.scss`
- `src/components/coaches/coach-gallery-list/coach-gallery-list.scss`
- `src/components/sport-info/sport-info-page/sport-info-page.scss`
- Removed redundant preview/variation artifacts:
- deleted `src/styles/home-variation-a.scss`, `src/styles/home-variation-b.scss`, `src/styles/citysquash-preview.scss`
- deleted `app/page-variation-a.tsx`, `app/page-variation-b.tsx`
- deleted `app/preview/a/page.tsx`, `app/preview/b/page.tsx`, `app/preview/palette-1/page.tsx`, `app/preview/palette-2/page.tsx`, `app/preview/palette-3/page.tsx`, `app/preview/citysquash-style/page.tsx`
- Updated `app/layout.tsx` to import `../src/components/styles/index.scss`.
- Updated admin media preview revalidation to remove the now-deleted `/preview/citysquash-style` path.
- Verification: `npm run lint` passed with existing warnings only (`<img>` optimization warnings and one pre-existing unused variable warning).
