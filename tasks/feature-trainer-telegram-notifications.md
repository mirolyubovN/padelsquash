# Feature: Trainer Telegram Notifications

Two delivery channels for booking events:

- **Common operations chat** (one Telegram group/channel) — receives **every** booking create/cancel and the daily end-of-day digest grouped by trainer.
- **Per-trainer DM** — each trainer receives only the bookings that involve them, plus their own end-of-day "tomorrow" summary.

## Current State

- `src/lib/notifications/bookings.ts` already calls `sendTelegramMessage` for trainer recipients on create/cancel **if** `User.telegramChatId` is set on the trainer.
- The only path that populates `User.telegramChatId` today is the **customer** registration flow (`src/lib/notifications/telegram-verify-bot.ts`) — trainers have no way to subscribe their Telegram. So in practice, trainer Telegram notifications are dead code.
- No common operations chat is wired up. Today admin notifications go to admin emails / personal Telegrams (whichever admins have linked individually).
- No daily reminder exists.

This feature productizes: (1) a trainer-facing DM subscription flow, (2) a single configurable common Telegram chat for all booking traffic, (3) a daily digest cron that posts to both channels.

---

## Part 1 — Common Operations Chat

A single Telegram group/supergroup/channel where the bot is a member with permission to post. Every booking event goes here — admins and trainers can all watch one stream instead of curating personal subscriptions.

### Configuration

Store the common chat id in `WalletBonusConfig`-style settings (DB) rather than env, so super admins can change it without a redeploy.

New Prisma model:

```prisma
model TelegramChannelConfig {
  key             String   @id @default("default") // single-row config; future-proofs multi-tenant
  commonChatId    String?  // numeric id (e.g. -1001234567890) or @channelusername
  commonChatTitle String?  // human label for the admin UI ("Padel Ops")
  enabled         Boolean  @default(true)
  updatedByUserId String?
  updatedAt       DateTime @updatedAt
  createdAt       DateTime @default(now())
}
```

Migration: `20260601000500_telegram_channel_config`.

### Setup flow

`/admin/settings/telegram` (super admin only):

- Step 1: instructions ("Add @<TELEGRAM_BOT_USERNAME> to your Telegram group as an admin with permission to post messages.").
- Step 2: input for the common chat id. Two ways to populate it:
  - **Manual**: super admin pastes the chat id (we display a one-liner explaining how to get it via `@RawDataBot` or by sending `/getchatid` to the bot inside the group).
  - **Auto-discovery**: the bot listens for `/registerchat <secret>` messages in any chat where it is a member. Super admin generates a one-time `secret` (TTL 10 min) on the settings page and types `/registerchat <secret>` into the target group. The bot resolves `update.message.chat.id`, persists it as `commonChatId`, and replies "Chat connected as common operations channel".
- After saving: bot posts a confirmation message to the chat ("✅ Подключено как общий канал уведомлений Racket Community Kst").
- "Отправить тестовое сообщение" button.
- "Отключить" clears `commonChatId` and posts a goodbye message.

### Bot update

Extend the polling handler in `src/lib/notifications/telegram-verify-bot.ts` (renaming to `telegram-bot.ts`):

- `/start` (no payload) — existing customer phone flow.
- `/start trainer_<token>` — trainer DM subscription (Part 2).
- `/registerchat <secret>` — common chat registration (admin-initiated, see above).
- `/getchatid` — replies with `chat.id` and `chat.type` (debug helper).

The bot only writes to chats it has been added to; Telegram returns `403 Forbidden` if not. Catch and surface that error in the UI.

### Sender helper

`src/lib/notifications/telegram-channels.ts`:

```ts
export interface TelegramRecipient {
  kind: "user" | "common_chat";
  chatId: string;
  label?: string; // for logs
}

export async function resolveCommonChatRecipient(): Promise<TelegramRecipient | null> {
  const config = await prisma.telegramChannelConfig.findUnique({ where: { key: "default" } });
  if (!config?.enabled || !config.commonChatId) return null;
  return { kind: "common_chat", chatId: config.commonChatId, label: config.commonChatTitle ?? "common" };
}
```

---

## Part 2 — Trainer DM Subscription

### UI

New page `/trainer/notifications` (linked from `/trainer/schedule` header):

- **Not connected**: deep link `https://t.me/<TELEGRAM_BOT_USERNAME>?start=trainer_<token>` with copy button + QR code (use `qrcode` npm package, render to data URL on the server).
- **Connected**: shows linked Telegram username/chat id and "Отключить" button.

### Schema

```prisma
enum TelegramLinkPurpose {
  trainer_notifications
  admin_notifications // reserved for later
}

model TelegramLinkToken {
  id         String              @id @default(cuid())
  userId     String
  purpose    TelegramLinkPurpose
  tokenHash  String              @unique // sha256 of the random 32-byte token
  expiresAt  DateTime
  consumedAt DateTime?
  createdAt  DateTime            @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, purpose, expiresAt])
}
```

User relation back-reference needed. Token TTL: 30 minutes (env `TELEGRAM_LINK_TTL_MINUTES`).

Migration: `20260601001000_telegram_link_tokens`.

### Bot handler

`/start trainer_<token>` → hash + lookup unconsumed `TelegramLinkToken`, set the user's `telegramChatId`/`telegramUsername`, mark consumed, reply "Уведомления подключены".

### Server actions

`src/lib/trainer/notifications.ts`:
- `requestTrainerTelegramLink({ userId })` — returns deep link.
- `disconnectTrainerTelegram({ userId })` — sends "Уведомления отключены" then clears chat id.

Gated by `assertTrainer()`.

---

## Part 3 — Per-Booking Notifications (refactor)

`src/lib/notifications/bookings.ts` already builds the message and dispatches to admin recipients + trainer recipients. Extend it to also dispatch to the common chat **and** to gate trainer DMs by how soon the booking starts (noise control — see "DM horizon" below).

### Dispatch matrix

| Event | Common chat | Each involved trainer DM | Admin DMs/emails |
|---|---|---|---|
| Booking created (court rental, no trainer) | yes | n/a | yes (existing) |
| Booking created (training with trainer) — starts within `TRAINER_DM_CREATE_HORIZON_HOURS` | yes | yes (only that trainer) | yes (existing) |
| Booking created (training with trainer) — starts further out | yes | **no** (trainer learns about it via end-of-day digest the night before) | yes (existing) |
| Booking cancelled — starts within `TRAINER_DM_CANCEL_HORIZON_HOURS` | yes | yes (if training) | yes (existing) |
| Booking cancelled — starts further out, or already in the past | yes | **no** | yes (existing) |

### DM horizon rules

- **Creation horizon** — default `48` hours. Catches today + tomorrow without needing the trainer to read the digest. Far-out bookings are not signal-relevant when created.
- **Cancellation horizon** — default `168` hours (7 days). Cancellations reshuffle a trainer's plan further out than new bookings do; "your Tuesday training is cancelled" is still useful on Sunday.
- **Past bookings** — never DM (admin backfill, manual completion / no-show flips, etc. stay silent for trainers).
- Both horizons are computed against `Booking.startAt` vs `now()`, in UTC. Env vars: `TRAINER_DM_CREATE_HORIZON_HOURS`, `TRAINER_DM_CANCEL_HORIZON_HOURS`. Set either to `0` to disable that DM kind entirely; set very high (e.g. `8760`) to effectively always DM.
- The common chat ignores horizons — admins want full operational visibility regardless of when the booking starts.

### Implementation

### Implementation

Refactor `notifyForBookingEvent` in `src/lib/notifications/bookings.ts`:

```ts
async function notifyForBookingEvent(args) {
  const context = await loadBookingNotificationContext(args.bookingId);
  if (!context) return;

  const [adminRecipients, trainerRecipients, commonChat] = await Promise.all([
    resolveAdminRecipients(),
    resolveTrainerRecipients(context.instructorIds),
    resolveCommonChatRecipient(),
  ]);

  // 1. Admin email + personal Telegram (existing behavior). No horizon gating.
  const adminPayload = buildAdminMessage({ ... });
  await Promise.all(adminRecipients.map((r) => deliverToRecipient(r, adminPayload)));

  // 2. Common chat — Telegram only, uses the admin-style message body
  //    (operations stream; full detail is appropriate; no horizon gating).
  if (commonChat) {
    await sendTelegramMessage({ chatId: commonChat.chatId, text: adminPayload.text });
  }

  // 3. Each involved trainer DM — gated by horizon and event type.
  if (trainerRecipients.length > 0 && shouldDmTrainersForEvent({
    event: args.event,                  // "created" | "cancelled"
    bookingStartAt: context.startAt,
    now: new Date(),
  })) {
    const trainerPayload = buildTrainerMessage({ ... });
    await Promise.all(
      trainerRecipients
        .filter((r) => r.telegramChatId)
        .map((r) => sendTelegramMessage({ chatId: r.telegramChatId!, text: trainerPayload.text })),
    );
  }
}

function shouldDmTrainersForEvent(args: {
  event: "created" | "cancelled";
  bookingStartAt: Date;
  now: Date;
}): boolean {
  const hoursUntilStart = (args.bookingStartAt.getTime() - args.now.getTime()) / 3_600_000;
  if (hoursUntilStart < 0) return false; // never DM about past bookings

  const horizon =
    args.event === "created"
      ? Number(process.env.TRAINER_DM_CREATE_HORIZON_HOURS ?? 48)
      : Number(process.env.TRAINER_DM_CANCEL_HORIZON_HOURS ?? 168);

  if (!Number.isFinite(horizon) || horizon <= 0) return false;
  return hoursUntilStart <= horizon;
}
```

Put `shouldDmTrainersForEvent` in `src/lib/notifications/trainer-dm-policy.ts` so it's unit-testable in isolation and the env-var reads are centralized.

Note: trainers no longer receive booking emails — the common chat + their own DM cover ops + personal needs. If a trainer hasn't subscribed via Telegram, they get nothing personal but the booking still appears in the common chat. Admins keep email as primary because email is their verified/durable channel.

### De-duplication

A trainer who is also an admin (rare, but possible if a user has a personal admin account and is also an instructor) might receive the booking twice — once as an admin and once as a trainer. Acceptable; tag the trainer message subject differently so they can filter visually.

The common chat is the single shared destination — no risk of double-posting from this layer because there's exactly one common chat row.

### Failure handling

Wrap each sender in try/catch; one failure (e.g. bot kicked from the group) must not block the others. On `403` from Telegram for the common chat, log + continue; on `403` for a trainer DM, clear that trainer's `telegramChatId` automatically and surface a banner on `/trainer/notifications` next time they visit.

---

## Part 4 — End-of-Day Digest (21:00 Asia/Almaty)

Two output streams from the same cron worker:

### Stream A — Common chat: aggregated by trainer

Posts one message to the common chat listing tomorrow's confirmed sessions grouped by trainer. Format:

```
Расписание на завтра, 12 мая

Иван Иванов — 4 тренировки
  09:00–10:00 · Корт 1 · Петров П.
  11:00–12:00 · Корт 2 · Сидоров С.
  14:00–15:00 · Корт 1 · Алиев А.
  18:00–19:00 · Корт 3 · Кузнецов К.

Мария Смирнова — 2 тренировки
  10:00–11:00 · Корт 2 · Сидоров С.
  19:00–20:00 · Корт 1 · Иванов И.

Без тренера (аренда корта) — 6 броней
  08:00–09:00 · Корт 1
  ...

Всего: 12 броней
```

Includes both training sessions (grouped by instructor) and court-rental bookings (grouped under "Без тренера"). Sorted by start time within each group.

### Stream B — Per-trainer DMs: only their bookings

Each trainer with `telegramChatId` set gets their own message:

```
Завтра, 12 мая, у вас 4 тренировки:
  • 09:00–10:00 — Петров П. (Корт 1, Падел)
  • 11:00–12:00 — Сидоров С. (Корт 2)
  • 14:00–15:00 — Алиев А. (Корт 1)
  • 18:00–19:00 — Кузнецов К. (Корт 3)
```

If 0 sessions: `"Завтра тренировок нет."` (still send — the certainty is the value).

### Cron mechanism

Use `node-cron` started in `instrumentation.ts`:

```ts
cron.schedule("0 21 * * *", () => void runDailyDigest(), { timezone: "Asia/Almaty" });
```

Gated by `ENABLE_DAILY_DIGEST` env var (default `true`). Hour overridable via `DAILY_DIGEST_HOUR` (default `21`).

Also expose `POST /api/cron/daily-digest` (auth: `Bearer ${CRON_SECRET}`) for manual / external triggering. Same worker function.

### Worker

`src/lib/notifications/daily-digest.ts`:

```ts
export async function runDailyDigest(now = new Date()) {
  const tomorrowVenueDate = addVenueDays(toVenueIsoDate(now), 1);
  const dayStartUtc = venueDateTimeToUtc(tomorrowVenueDate, "00:00");
  const dayEndUtc   = venueDateTimeToUtc(tomorrowVenueDate, "23:59");

  // Dedupe: skip if AuditLog already has action=notification.daily_digest for tomorrowVenueDate.
  const dedupeKey = `daily_digest:${tomorrowVenueDate}`;
  const alreadySent = await prisma.auditLog.findFirst({
    where: { action: "notification.daily_digest", detail: { path: ["dedupeKey"], equals: dedupeKey } },
  });
  if (alreadySent) return;

  const bookings = await prisma.booking.findMany({
    where: {
      status: "confirmed",
      startAt: { gte: dayStartUtc, lte: dayEndUtc },
    },
    include: {
      customer: { select: { name: true } },
      service: { select: { name: true, sport: { select: { name: true } } } },
      resources: true,
    },
    orderBy: { startAt: "asc" },
  });

  // Resolve court + instructor names in batch.
  // Group: trainerSessions = Map<instructorId, Booking[]>; courtRentals = Booking[] without instructor.
  // Build common-chat message (Stream A).
  // For each instructor in the map, resolve their User by Instructor.trainerUser → DM (Stream B).
  // For instructors with sessions tomorrow but no linked telegramChatId, skip Stream B silently
  //   (still appear in Stream A for the common chat).

  const commonChat = await resolveCommonChatRecipient();
  if (commonChat) {
    await sendTelegramMessage({ chatId: commonChat.chatId, text: buildCommonDigest(...) });
  }

  for (const [instructorId, sessions] of trainerSessions) {
    const trainerUser = await getTrainerUserByInstructor(instructorId);
    if (trainerUser?.telegramChatId) {
      await sendTelegramMessage({
        chatId: trainerUser.telegramChatId,
        text: buildTrainerDigest(trainerUser.name, sessions),
      });
    }
  }

  // Also DM trainers with 0 sessions tomorrow (so they get the "no sessions" certainty).
  const subscribedTrainers = await prisma.user.findMany({
    where: { role: "trainer", telegramChatId: { not: null }, active: true },
    select: { id: true, instructorId: true, telegramChatId: true, name: true },
  });
  for (const t of subscribedTrainers) {
    if (!trainerSessions.has(t.instructorId!)) {
      await sendTelegramMessage({ chatId: t.telegramChatId!, text: "Завтра тренировок нет." });
    }
  }

  await prisma.auditLog.create({
    data: {
      action: "notification.daily_digest",
      entityType: "system",
      entityId: dedupeKey,
      detail: {
        dedupeKey,
        date: tomorrowVenueDate,
        commonChatSent: !!commonChat,
        trainerDmsSent: subscribedTrainers.length,
        sessionCount: bookings.length,
      },
    },
  });
}
```

Dedupe key uses the venue date; an instance restart at 21:00:30 won't duplicate posts.

### Manual triggers (admin UI)

- `/admin/settings/telegram` — "Отправить дайджест на завтра вручную" button (super admin). Bypasses the dedupe check (so super admin can re-send if they need to).
- `/admin/instructors/[id]` — "Отправить личный дайджест этому тренеру" (super admin) — DM-only for that one trainer.

---

## Configuration Summary

New env vars in `.env.example`:
- `ENABLE_DAILY_DIGEST` — default `"true"`.
- `DAILY_DIGEST_HOUR` — default `"21"` (venue hour 0–23).
- `TELEGRAM_LINK_TTL_MINUTES` — default `"30"`.
- `TRAINER_DM_CREATE_HORIZON_HOURS` — default `"48"`. Trainer DM on booking creation only when the booking starts within this window. `0` disables creation DMs entirely.
- `TRAINER_DM_CANCEL_HORIZON_HOURS` — default `"168"` (7 days). Trainer DM on booking cancellation only when the booking starts within this window. `0` disables cancellation DMs entirely.
- `CRON_SECRET` — required if the manual cron endpoint is exposed publicly.

Existing `TELEGRAM_BOT_TOKEN` + `TELEGRAM_BOT_USERNAME` cover the bot identity for all three channels.

---

## Tests

- Unit: `runDailyDigest` with seeded bookings + a mocked `sendTelegramMessage` — assert (a) common-chat message format groups by trainer correctly and includes court rentals, (b) each trainer DM contains only their sessions, (c) trainers with 0 sessions get the empty message, (d) dedupe blocks the second invocation.
- Unit: `shouldDmTrainersForEvent` — table-driven cases: past start (no DM), within create horizon (DM on `created`, DM on `cancelled`), beyond create horizon but within cancel horizon (no DM on `created`, DM on `cancelled`), beyond both (no DM either), horizon set to `0` (no DM).
- Unit: `notifyForBookingEvent` — assert the common chat receives every event regardless of horizon, and trainer DMs only fire when the booking has an instructor + that trainer is subscribed + the horizon allows it.
- Unit: `/start trainer_<token>` handler — valid / expired / consumed.
- Unit: `/registerchat <secret>` handler — valid / expired / wrong secret.
- Integration: end-to-end with a Telegram API mock — admin links group, trainer links DM, booking is created, both messages land.

---

## Rollout

1. Apply migrations (`telegram_channel_config`, `telegram_link_tokens`).
2. Generalize the bot module (`telegram-verify-bot.ts` → `telegram-bot.ts`); ship handler dispatch.
3. Ship `/admin/settings/telegram` + `/registerchat` flow; super admin connects the common group.
4. Ship `/trainer/notifications`; trainers can subscribe.
5. Wire `notifyForBookingEvent` into the common-chat sender + trainer DM sender (Part 3).
6. Ship `runDailyDigest` worker behind `ENABLE_DAILY_DIGEST=false`; smoke-test by hitting the manual trigger; flip env var to `true`.
7. Watch logs for `403`s; auto-clear dead trainer chat ids; surface common-chat failures on `/admin/settings/telegram`.

---

## README/Docs

After ship:
- New routes: `/admin/settings/telegram`, `/trainer/notifications`.
- "Notifications" subsection under "Core Product Flows" describing the three channels.
- Env table additions.

---

## Open Questions

- Whether the common chat should also receive event-registration notifications (`ClubEvent` flow). Default: **yes**, treat them the same; they already share the admin email path. Confirm before ship.
- Whether to throttle the common chat (e.g. when an admin batch-creates a 6-slot training series, that's 6 messages). Acceptable for v1; revisit if it becomes noisy by collapsing series notifications into one summary message.
- Whether trainers should be able to mute their DM but stay in the common chat — out of scope; trainers always opt in to their own DM via the link, and can disconnect to stop.
