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
