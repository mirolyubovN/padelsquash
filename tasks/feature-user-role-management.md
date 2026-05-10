# Feature: User Role Management (Super Admin)

Super admin can create, edit, and deactivate `admin` and `trainer` accounts directly from the admin panel. Today only `customer` accounts can be created via UI (`/admin/wallet`); admins/trainers exist only through the seed script.

## Current State

- `User.role` enum includes `customer | trainer | admin | super_admin` (`prisma/schema.prisma:10-15`).
- Trainer accounts must also be linked to an `Instructor` row via `User.instructorId` (`schema.prisma:109`). The trainer portal (`/trainer/schedule`) requires this link (`src/lib/auth/guards.ts:68-83`).
- Seed (`prisma/seed.ts`) creates one super admin, one admin, one trainer, one customer. No admin UI exists for managing staff.
- `/admin/wallet` already has the customer-creation pattern (form → activation link → `/activate-account`). Reuse that pattern for staff.

## Scope

- Super admin can:
  - List all `admin` / `super_admin` / `trainer` users with role badges.
  - Create a new `admin` or `super_admin` (email + name + phone + initial password OR activation link).
  - Create a new `trainer` (same fields + Instructor selector — link to existing Instructor or create a new Instructor inline).
  - Edit name / email / phone of any staff user.
  - Reset password (issue activation link) of any staff user.
  - Toggle role between `admin` and `super_admin` (only super_admin can).
  - Deactivate a staff user (no `User.active` field today — see schema decision below).
  - Reassign or unlink a trainer's Instructor.
- Out of scope (v1): granular permissions beyond the existing four-role model, SSO, audit log UI (data goes into `AuditLog`, no dedicated viewer needed yet).

## Schema Changes

Add `User.active Boolean @default(true)` so staff can be deactivated without losing audit history (FKs prevent hard delete in many cases — bookings created by them, audit log actorUserId, etc.). Update auth checks to refuse login when `active = false`.

```prisma
model User {
  // ... existing fields ...
  active Boolean @default(true)
}
```

Migration: `20260601002000_user_active_flag`.

Update `auth.ts` (Auth.js Credentials provider): after password check, also reject `user.active === false` with a localized error.

Update guards in `src/lib/auth/guards.ts` to call `redirect("/login?error=account_disabled")` when the session points at a deactivated user.

## Routes

- `/admin/staff` — list page (super admin only).
- `/admin/staff/new` or modal on the list page — create form.
- `/admin/staff/[userId]` — edit page (or modal).

Place under `/admin/staff` (not `/admin/users`) to disambiguate from "клиенты" which is already taken (`/admin/clients` = customers).

Add nav entry to `app/admin/layout.tsx` under the same group as `/admin/clients`, visible only when `session.user.role === "super_admin"`.

## Server Actions

`src/lib/admin/staff.ts`:

```ts
type StaffRole = "admin" | "super_admin" | "trainer";

interface CreateStaffInput {
  name: string;
  email: string;
  phone: string;
  role: StaffRole;
  // For trainer:
  instructorMode?: "link_existing" | "create_new";
  instructorId?: string;             // when link_existing
  newInstructor?: {                  // when create_new
    name: string;                    // defaults to user name if blank
    bio?: string;
    sportPrices: Array<{ sportId: string; pricePerHour: number }>;
    locationIds: string[];
  };
  // Password setup:
  passwordMode: "manual" | "activation_link";
  password?: string;                 // when manual; min 8 chars, mixed case + digit
}

export async function createStaffMember(input: CreateStaffInput) {
  await assertSuperAdmin();
  // Zod validation, then transactional create:
  //  1. If trainer + create_new: prisma.instructor.create + InstructorSport rows + InstructorLocation rows.
  //  2. prisma.user.create with role + instructorId (when trainer).
  //  3. If passwordMode === "activation_link": create activation token via the same helper used by admin-created customers (src/lib/auth/activation.ts).
  //  4. AuditLog: { action: "staff.create", entityType: "user", entityId, detail: { role, instructorId? } }.
  // Returns the new user + activation link if applicable.
}

export async function updateStaffMember(input: UpdateStaffInput) { ... }
export async function setStaffPassword(input: SetStaffPasswordInput) { ... } // issues new activation link
export async function setStaffActive(input: { userId: string; active: boolean }) { ... }
export async function changeStaffRole(input: { userId: string; role: "admin" | "super_admin" }) { ... }
export async function relinkTrainerInstructor(input: { userId: string; instructorId: string | null }) { ... }
```

All actions:
- Gated by `assertSuperAdmin()`.
- Validated with Zod schemas in `src/lib/admin/staff-schema.ts`.
- Write `AuditLog` rows with `actorUserId = session.user.id`.

### Safety rules

- Cannot demote yourself from `super_admin` to `admin`.
- Cannot deactivate yourself.
- Cannot deactivate the last active `super_admin` (server-side count check).
- Trainer role requires either an existing Instructor or inline-created Instructor — enforce in Zod refinement.
- Email uniqueness — Prisma unique constraint already enforces; map to a friendly Russian error.
- Phone uniqueness — currently `User.phone` is not unique. Decision: keep non-unique (customers and a trainer might legitimately share a club landline). Leave as-is.

## Activation Link Flow Reuse

`/activate-account` already handles password setup for admin-created customers. Audit `src/lib/auth/activation.ts` (or wherever the activation token is generated) and confirm it works for any role; if it currently filters to `role: "customer"`, generalize it to staff roles too.

When `passwordMode = "activation_link"`, the response shows the link in the create modal (same UX as `/admin/wallet` customer creation) so the super admin can copy + send via Telegram/email manually. Do **not** auto-send by email — staff onboarding usually involves a personal handoff.

## UI Details

### `/admin/staff` list

Columns: role badge | name | email | phone | trainer-link (linked Instructor name + link) | active | created | actions.

Filters: role (all/admin/super_admin/trainer), active (all/active/disabled), search by name/email.

### Create modal

Tabs or radio: "Администратор" vs "Тренер".

**Admin tab** fields:
- Имя
- Email
- Телефон
- Роль: `admin` / `super_admin`
- Способ задания пароля: "Сгенерировать ссылку для активации" (default) / "Задать пароль вручную"
- Пароль (if manual) + confirm
- Submit → "Сотрудник создан" with copy-to-clipboard link if activation mode

**Trainer tab** fields:
- All admin fields (role auto = `trainer`)
- Привязка к тренеру:
  - "Связать с существующим тренером" → searchable select of unlinked Instructors (filter `Instructor.trainerUser` = null)
  - "Создать новую карточку тренера" → inline form: bio, photoUrl (reuse `InstructorPhotoInput`), per-sport prices (reuse the price-by-sport pattern from `/admin/instructors/[id]`), location selector
- Submit → same activation/password handling

### Edit page

- Read-only role + activate/deactivate switch + "Изменить роль" inline action (super_admin/admin toggle).
- Editable name/email/phone.
- "Сбросить пароль" → confirms, generates new activation link, invalidates current password.
- For trainers: "Связанная карточка тренера" with link to `/admin/instructors/[id]` + "Отвязать" / "Привязать другую".
- "Деактивировать аккаунт" with confirm modal listing impact (cannot log in, existing bookings/audit history preserved).
- Recent audit log entries for this user (filter `AuditLog` by `entityType: "user"` AND `entityId = userId` OR `actorUserId = userId`).

## Audit Logging

Every action writes to `AuditLog`:
- `staff.create`
- `staff.update`
- `staff.role_change`
- `staff.password_reset`
- `staff.activate`
- `staff.deactivate`
- `staff.trainer_link`
- `staff.trainer_unlink`

`detail` JSON contains the diff (old → new) for updates, the role for role changes, etc.

## Tests

- Unit: each server action — happy path + every safety rule (self-demote, last super_admin, etc.).
- Integration: create trainer with inline Instructor creation, verify both rows + InstructorSport + InstructorLocation are created in one transaction.
- E2E: super admin logs in, creates an admin, copies activation link, opens link as that admin, sets password, logs in to `/admin`. Repeat for trainer ending at `/trainer/schedule`.
- Auth: deactivated staff cannot log in (password rejected with `account_disabled` error).

## Seed Update

Update `prisma/seed.ts` to set `active: true` explicitly on all seeded users (the default covers it but be explicit for clarity).

## README/Docs

After ship:
- Add `/admin/staff` to the admin routes table.
- Add a "Staff & Role Management" subsection under "Core Product Flows".
- Note that admins/trainers can now be created from the UI, not only via seed.
- Update the User Roles table to mention that role assignment happens at `/admin/staff`.

## Rollout

1. Apply migration `user_active_flag`.
2. Update auth + guards to honor `active = false`.
3. Generalize activation token logic for staff roles (if needed).
4. Ship list + create flows.
5. Ship edit + deactivate flows.
6. Verify the seeded super admin can create a second super admin → bootstrap is no longer dependent on env vars after first install.

## Open Questions

- Trainer accounts may exist without an `Instructor` link in legacy data (`User.instructorId` is nullable). Decision: require the link going forward; if any orphan trainer-role users exist, surface them in the list with a "Привязать карточку" warning rather than auto-fixing.
- Email change on staff: should it require re-verification like for customers? Default: **no** — staff emails are managed by the super admin, and customer-style verification doesn't apply. Document this.
- 2FA for super admins: out of scope; tracked separately.
