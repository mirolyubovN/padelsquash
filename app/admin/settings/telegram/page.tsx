import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { AdminPageShell } from "@/src/components/admin/admin-page-shell";
import { assertSuperAdmin } from "@/src/lib/auth/guards";
import { buildPageMetadata } from "@/src/lib/seo/metadata";
import { getTelegramBotUsername } from "@/src/lib/notifications/telegram";
import {
  createRegisterChatSecret,
  disconnectTelegramChannel,
  getTelegramChannelSettings,
  saveTelegramChannelSettings,
  sendCommonChatTestMessage,
} from "@/src/lib/notifications/telegram-channels";
import { runDailyDigest } from "@/src/lib/notifications/daily-digest";

export const metadata = buildPageMetadata({
  title: "Админ: Telegram | Padel & Squash KZ",
  description: "Настройка общего Telegram-канала уведомлений.",
  path: "/admin/settings/telegram",
  noIndex: true,
});

export const dynamic = "force-dynamic";

function getMessage(code: string | undefined): string | null {
  if (code === "saved") return "Настройки Telegram сохранены.";
  if (code === "test_sent") return "Тестовое сообщение отправлено.";
  if (code === "digest_sent") return "Дайджест отправлен вручную.";
  if (code === "disconnected") return "Общий канал отключен.";
  return null;
}

function getError(code: string | undefined): string | null {
  if (code === "chat_required") return "Укажите chat id.";
  if (code === "test_failed") return "Не удалось отправить тестовое сообщение.";
  if (code === "digest_failed") return "Не удалось отправить дайджест.";
  if (code) return "Не удалось сохранить настройки.";
  return null;
}

export default async function AdminTelegramSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const session = await assertSuperAdmin();
  const params = await searchParams;
  const settings = await getTelegramChannelSettings();
  const botUsername = getTelegramBotUsername();
  const registerSecret = createRegisterChatSecret(session.user.id);
  const message = getMessage(params.success);
  const error = getError(params.error);

  async function saveAction(formData: FormData) {
    "use server";
    const actionSession = await assertSuperAdmin();
    const commonChatId = String(formData.get("commonChatId") ?? "").trim();
    const commonChatTitle = String(formData.get("commonChatTitle") ?? "").trim();
    if (!commonChatId) {
      redirect("/admin/settings/telegram?error=chat_required");
    }
    try {
      await saveTelegramChannelSettings({
        commonChatId,
        commonChatTitle,
        enabled: String(formData.get("enabled") ?? "") === "on",
        actorUserId: actionSession.user.id,
      });
    } catch {
      redirect("/admin/settings/telegram?error=save_failed");
    }
    revalidatePath("/admin/settings/telegram");
    redirect("/admin/settings/telegram?success=saved");
  }

  async function testAction() {
    "use server";
    await assertSuperAdmin();
    const sent = await sendCommonChatTestMessage();
    redirect(`/admin/settings/telegram?${sent ? "success=test_sent" : "error=test_failed"}`);
  }

  async function disconnectAction() {
    "use server";
    const actionSession = await assertSuperAdmin();
    await disconnectTelegramChannel(actionSession.user.id);
    revalidatePath("/admin/settings/telegram");
    redirect("/admin/settings/telegram?success=disconnected");
  }

  async function digestAction() {
    "use server";
    await assertSuperAdmin();
    try {
      await runDailyDigest(new Date(), { force: true });
    } catch {
      redirect("/admin/settings/telegram?error=digest_failed");
    }
    redirect("/admin/settings/telegram?success=digest_sent");
  }

  return (
    <AdminPageShell title="Telegram" description="Общий канал операций и ручная отправка уведомлений.">
      {message ? <p className="account-history__message account-history__message--success" role="status">{message}</p> : null}
      {error ? <p className="account-history__message account-history__message--error" role="alert">{error}</p> : null}

      <section className="admin-section">
        <div className="admin-section__head">
          <h2 className="admin-section__title">Общий канал уведомлений</h2>
          <p className="admin-section__description">
            Добавьте бота {botUsername ? `@${botUsername}` : "из переменной TELEGRAM_BOT_USERNAME"} в группу и дайте ему право отправлять сообщения.
          </p>
        </div>

        <form action={saveAction} className="admin-form admin-form--panel">
          <div className="admin-form__panel-grid">
            <div className="admin-form__group">
              <label className="admin-form__label" htmlFor="telegram-common-chat-id">Chat id</label>
              <input
                id="telegram-common-chat-id"
                name="commonChatId"
                className="admin-form__field"
                defaultValue={settings.commonChatId ?? ""}
                placeholder="-1001234567890 или @channelname"
              />
              <p className="admin-bookings__cell-sub">Можно отправить `/getchatid` в группе, где находится бот.</p>
            </div>
            <div className="admin-form__group">
              <label className="admin-form__label" htmlFor="telegram-common-chat-title">Название</label>
              <input
                id="telegram-common-chat-title"
                name="commonChatTitle"
                className="admin-form__field"
                defaultValue={settings.commonChatTitle ?? ""}
                placeholder="Padel Ops"
              />
            </div>
            <div className="admin-form__group">
              <label className="admin-form__checkbox">
                <input name="enabled" type="checkbox" defaultChecked={settings.enabled} />
                <span>Канал включен</span>
              </label>
            </div>
          </div>
          <div className="admin-form__actions">
            <button type="submit" className="admin-form__submit">Сохранить</button>
          </div>
        </form>
      </section>

      <section className="admin-section">
        <div className="admin-section__head">
          <h2 className="admin-section__title">Автоподключение группы</h2>
          <p className="admin-section__description">
            Отправьте эту команду в нужной группе. Секрет действует 10 минут.
          </p>
        </div>
        <div className="admin-form admin-form--panel">
          <div className="admin-form__group">
            <label className="admin-form__label">Команда для группы</label>
            <input className="admin-form__field" value={`/registerchat ${registerSecret}`} readOnly />
          </div>
        </div>
      </section>

      <section className="admin-section">
        <div className="admin-bookings__actions">
          <form action={testAction}>
            <button type="submit" className="admin-bookings__action-button">Отправить тест</button>
          </form>
          <form action={digestAction}>
            <button type="submit" className="admin-bookings__action-button">Отправить дайджест на завтра</button>
          </form>
          <form action={disconnectAction}>
            <button type="submit" className="admin-bookings__action-button admin-bookings__action-button--danger">Отключить канал</button>
          </form>
        </div>
      </section>
    </AdminPageShell>
  );
}
