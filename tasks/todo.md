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
