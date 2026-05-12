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
import { t } from "@/src/lib/i18n";

export const metadata = buildPageMetadata({
	title: "Админ: Telegram | Racket Community Kst",
	description: "Настройка общего Telegram-канала уведомлений.",
	path: "/admin/settings/telegram",
	noIndex: true,
});

export const dynamic = "force-dynamic";

function getMessage(code: string | undefined): string | null {
	if (code === "saved") return t("admin.telegram.messages.saved");
	if (code === "test_sent") return t("admin.telegram.messages.testSent");
	if (code === "digest_sent") return t("admin.telegram.messages.digestSent");
	if (code === "disconnected") return t("admin.telegram.messages.disconnected");
	return null;
}

function getError(code: string | undefined): string | null {
	if (code === "chat_required") return t("admin.telegram.errors.chatRequired");
	if (code === "test_failed") return t("admin.telegram.errors.testFailed");
	if (code === "digest_failed") return t("admin.telegram.errors.digestFailed");
	if (code) return t("admin.telegram.errors.saveFailed");
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
		<AdminPageShell title="Telegram" description={t("admin.telegram.pageDescription")}>
			{message ? <p className="account-history__message account-history__message--success" role="status">{message}</p> : null}
			{error ? <p className="account-history__message account-history__message--error" role="alert">{error}</p> : null}

			<section className="admin-section">
				<div className="admin-section__head">
					<h2 className="admin-section__title">{t("admin.telegram.commonChannelTitle")}</h2>
					<p className="admin-section__description">
						{t("admin.telegram.commonChannelDescription", {
							bot: botUsername ? `@${botUsername}` : t("admin.telegram.botUsernameFallback"),
						})}
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
								placeholder={t("admin.telegram.chatIdPlaceholder")}
							/>
							<p className="admin-bookings__cell-sub">{t("admin.telegram.getChatIdHint")}</p>
						</div>
						<div className="admin-form__group">
							<label className="admin-form__label" htmlFor="telegram-common-chat-title">{t("admin.telegram.fields.title")}</label>
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
								<span>{t("admin.telegram.fields.enabled")}</span>
							</label>
						</div>
					</div>
					<div className="admin-form__actions">
						<button type="submit" className="admin-form__submit">{t("admin.common.save")}</button>
					</div>
				</form>
			</section>

			<section className="admin-section">
				<div className="admin-section__head">
					<h2 className="admin-section__title">{t("admin.telegram.autoConnectTitle")}</h2>
					<p className="admin-section__description">
						{t("admin.telegram.autoConnectDescription")}
					</p>
				</div>
				<div className="admin-form admin-form--panel">
					<div className="admin-form__group">
						<label className="admin-form__label">{t("admin.telegram.groupCommandLabel")}</label>
						<input className="admin-form__field" value={`/registerchat ${registerSecret}`} readOnly />
					</div>
				</div>
			</section>

			<section className="admin-section">
				<div className="admin-bookings__actions">
					<form action={testAction}>
						<button type="submit" className="admin-bookings__action-button">{t("admin.telegram.actions.sendTest")}</button>
					</form>
					<form action={digestAction}>
						<button type="submit" className="admin-bookings__action-button">{t("admin.telegram.actions.sendTomorrowDigest")}</button>
					</form>
					<form action={disconnectAction}>
						<button type="submit" className="admin-bookings__action-button admin-bookings__action-button--danger">{t("admin.telegram.actions.disconnect")}</button>
					</form>
				</div>
			</section>
		</AdminPageShell>
	);
}
