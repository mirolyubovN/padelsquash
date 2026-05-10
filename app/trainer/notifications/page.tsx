import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { PageHero } from "@/src/components/page-hero";
import { buildPageMetadata } from "@/src/lib/seo/metadata";
import {
  disconnectTrainerTelegram,
  getTrainerTelegramNotificationState,
} from "@/src/lib/trainer/notifications";
import { assertTrainer, requireTrainer } from "@/src/lib/auth/guards";

export const metadata = buildPageMetadata({
  title: "Кабинет тренера: уведомления | Padel & Squash KZ",
  description: "Подключение личных Telegram-уведомлений тренера.",
  path: "/trainer/notifications",
  noIndex: true,
});

export const dynamic = "force-dynamic";

export default async function TrainerNotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  await requireTrainer("/trainer/notifications");
  const params = await searchParams;
  const state = await getTrainerTelegramNotificationState();
  const successMessage = params.success === "disconnected" ? "Telegram-уведомления отключены." : null;

  async function disconnectAction() {
    "use server";
    await assertTrainer();
    await disconnectTrainerTelegram();
    revalidatePath("/trainer/notifications");
    redirect("/trainer/notifications?success=disconnected");
  }

  return (
    <div className="account-page">
      <PageHero
        eyebrow="Кабинет тренера"
        title="Telegram-уведомления"
        description="Подключите личные сообщения о ближайших тренировках и ежедневный дайджест."
      />

      <div className="admin-bookings__actions">
        <Link href="/trainer/schedule" className="admin-bookings__action-button">Расписание</Link>
      </div>

      {successMessage ? (
        <p className="account-history__message account-history__message--success" role="status">{successMessage}</p>
      ) : null}

      <section className="admin-section">
        <div className="admin-section__head">
          <h2 className="admin-section__title">Статус подключения</h2>
          <p className="admin-section__description">
            Личные сообщения приходят только в ваш Telegram. Общий канал клуба настраивает супер-администратор.
          </p>
        </div>

        {state.connected ? (
          <div className="admin-form admin-form--panel">
            <p className="account-history__message account-history__message--success">
              Подключено{state.telegramUsername ? `: @${state.telegramUsername}` : ""}.
            </p>
            <p className="admin-bookings__cell-sub">Chat id: {state.telegramChatId}</p>
            <form action={disconnectAction} className="admin-form__actions">
              <button type="submit" className="admin-bookings__action-button admin-bookings__action-button--danger">
                Отключить
              </button>
            </form>
          </div>
        ) : state.linkUrl ? (
          <div className="admin-form admin-form--panel">
            <p className="admin-section__description">
              Откройте ссылку, нажмите Start в Telegram и вернитесь на эту страницу.
            </p>
            <div className="admin-form__group">
              <label className="admin-form__label">Ссылка подключения</label>
              <input className="admin-form__field" value={state.linkUrl} readOnly />
            </div>
            <p className="admin-bookings__cell-sub">
              Ссылка действует до {state.expiresAt?.toLocaleString("ru-KZ") ?? "истечения срока"}.
            </p>
            <div className="admin-form__actions">
              <a href={state.linkUrl} target="_blank" rel="noreferrer" className="admin-form__submit">
                Открыть Telegram
              </a>
            </div>
          </div>
        ) : (
          <p className="account-history__message account-history__message--error">
            Telegram-бот не настроен. Обратитесь к администратору клуба.
          </p>
        )}
      </section>
    </div>
  );
}
