import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHero } from "@/src/components/page-hero";
import { AccountTabs } from "@/src/components/account/account-tabs";
import { topUpWalletAction, updateAccountEmailAction, updateAccountProfileAction } from "@/app/account/actions";
import { requireAuthenticatedUser } from "@/src/lib/auth/guards";
import { getAccountDashboardData } from "@/src/lib/account/bookings";
import { getCustomerCancellationPolicySummary } from "@/src/lib/bookings/policy";
import { buildPageMetadata } from "@/src/lib/seo/metadata";
import { canAccessAdminPortal, getRoleLabel } from "@/src/lib/auth/roles";
import { formatMoneyKzt } from "@/src/lib/format/money";
import { t } from "@/src/lib/i18n";
import { getAccountWalletPageData } from "@/src/lib/wallet/queries";

export const metadata = buildPageMetadata({
	title: "Личный кабинет | Racket Community Kst",
	description: "Профиль клиента: личные данные, баланс, пополнение и быстрая сводка по бронированиям.",
	path: "/account",
	noIndex: true,
});

export const dynamic = "force-dynamic";

function getWalletTypeLabel(type: string): string {
	if (type === "topup") return t("account.wallet.transaction.topup");
	if (type === "bonus") return t("account.wallet.transaction.bonus");
	if (type === "admin_credit") return t("account.wallet.transaction.adminCredit");
	if (type === "admin_debit") return t("account.wallet.transaction.adminDebit");
	if (type === "booking_charge") return t("account.wallet.transaction.bookingCharge");
	if (type === "booking_refund") return t("account.wallet.transaction.bookingRefund");
	if (type === "event_charge") return t("account.wallet.transaction.eventCharge");
	if (type === "event_refund") return t("account.wallet.transaction.eventRefund");
	return type;
}

export default async function AccountPage({
	searchParams,
}: {
	searchParams: Promise<{ success?: string; error?: string; next?: string }>;
}) {
	const cancellationPolicySummary = getCustomerCancellationPolicySummary();
	const session = await requireAuthenticatedUser("/account");
	if (canAccessAdminPortal(session.user.role)) {
		redirect("/admin");
	}
	const params = await searchParams;
	const [data, wallet] = await Promise.all([
		getAccountDashboardData(session.user.id),
		getAccountWalletPageData(session.user.id),
	]);
	const roleLabel = getRoleLabel(data.user.role);
	const successMessage =
		params.success === "profile_saved"
			? t("account.profile.success.saved")
			: params.success === "email_unchanged"
				? t("account.profile.success.emailUnchanged")
				: params.success === "wallet_topped_up"
					? t("account.profile.success.walletToppedUp")
					: null;
	const errorMessage =
		params.error === "profile_invalid"
			? t("account.profile.error.invalid")
			: params.error === "email_invalid"
				? t("account.profile.error.emailInvalid")
				: params.error === "email_taken"
					? t("account.profile.error.emailTaken")
					: params.error === "wallet_invalid"
						? t("account.profile.error.walletInvalid")
						: null;
	const returnAfterTopUp = params.next ? decodeURIComponent(params.next) : "";

	return (
		<div className="account-page">
			<PageHero
				eyebrow={t("account.common.eyebrow")}
				title={t("account.profile.hero.title")}
				description={t("account.profile.hero.description", { cancellationPolicySummary })}
			/>

			<AccountTabs active="profile" />

			{errorMessage ? (
				<p className="account-history__message account-history__message--error" role="alert">
					{errorMessage}
				</p>
			) : null}
			{successMessage ? (
				<p className="account-history__message account-history__message--success" role="status">
					{successMessage}
				</p>
			) : null}

			<section className="account-page__cards">
				<article className="account-card">
					<h2 className="account-card__title">{t("account.wallet.title")}</h2>
					<div className="account-stats">
						<div className="account-stats__item">
							<span className="account-stats__label">{t("account.wallet.availableNow")}</span>
							<span className="account-stats__value">{formatMoneyKzt(wallet.balanceKzt)}</span>
						</div>
						<div className="account-stats__item">
							<span className="account-stats__label">{t("account.wallet.topUpBonus")}</span>
							<span className="account-stats__value">
								{wallet.bonusSettings.active
									? t("account.wallet.bonusValue", {
										percent: wallet.bonusSettings.bonusPercent,
										threshold: formatMoneyKzt(wallet.bonusSettings.thresholdKzt),
									})
									: t("account.wallet.bonusDisabled")}
							</span>
						</div>
					</div>
					<p className="account-card__text">
						{t("account.wallet.description")}
					</p>
					{returnAfterTopUp ? (
						<p className="account-card__hint">{t("account.wallet.returnAfterTopUpHint")}</p>
					) : null}

					<form action={topUpWalletAction} className="account-profile-form">
						<input type="hidden" name="next" value={returnAfterTopUp} />
						<p className="account-profile-form__title">{t("account.wallet.topUpTitle")}</p>
						<div className="account-profile-form__grid">
							<div className="auth-form__group">
								<label htmlFor="wallet-amount" className="auth-form__label">
									{t("account.wallet.amountLabel")}
								</label>
								<input
									id="wallet-amount"
									name="amountKzt"
									type="number"
									min={1000}
									step={1000}
									defaultValue={wallet.bonusSettings.thresholdKzt}
									className="auth-form__field"
									required
								/>
							</div>
						</div>
						<div className="account-profile-form__actions">
							<button type="submit" className="auth-form__submit">
								{t("account.wallet.topUpSubmit")}
							</button>
						</div>
					</form>

					<div className="account-card__subsection">
						<p className="account-profile-form__title">{t("account.wallet.recentTransactions")}</p>
						{wallet.transactions.length === 0 ? (
							<p className="account-card__text">{t("account.wallet.noTransactions")}</p>
						) : (
							<dl className="account-profile__list">
								{wallet.transactions.map((row) => (
									<div key={row.id} className="account-profile__item">
										<dt className="account-profile__label">
											{getWalletTypeLabel(row.type)}
											{row.note ? ` · ${row.note}` : ""}
										</dt>
										<dd className="account-profile__value">
											{row.amountKzt > 0 ? "+" : ""}
											{formatMoneyKzt(row.amountKzt)}
											{t("account.wallet.balanceAfter", { balance: formatMoneyKzt(row.balanceAfterKzt) })}
										</dd>
									</div>
								))}
							</dl>
						)}
					</div>
				</article>

				<article className="account-card">
					<h2 className="account-card__title">{t("account.profile.title")}</h2>
					<dl className="account-profile__list">
						<div className="account-profile__item">
							<dt className="account-profile__label">{t("auth.common.name")}</dt>
							<dd className="account-profile__value">{data.user.name}</dd>
						</div>
						<div className="account-profile__item">
							<dt className="account-profile__label">Email</dt>
							<dd className="account-profile__value">
								{data.user.email}
								{data.user.pendingEmail ? t("account.profile.pendingEmail", { email: data.user.pendingEmail }) : ""}
								{data.user.emailVerifiedAt && !data.user.pendingEmail
									? t("account.profile.verified")
									: t("account.profile.notVerified")}
							</dd>
						</div>
						<div className="account-profile__item">
							<dt className="account-profile__label">{t("auth.common.phone")}</dt>
							<dd className="account-profile__value">
								{data.user.phone}
								{data.user.pendingPhone ? t("account.profile.pendingPhone", { phone: data.user.pendingPhone }) : ""}
								{data.user.phoneVerifiedAt && !data.user.pendingPhone
									? t("account.profile.verified")
									: t("account.profile.notVerified")}
							</dd>
						</div>
						<div className="account-profile__item">
							<dt className="account-profile__label">{t("account.profile.accountType")}</dt>
							<dd className="account-profile__value">{roleLabel}</dd>
						</div>
					</dl>

					<form action={updateAccountProfileAction} className="account-profile-form">
						<p className="account-profile-form__title">{t("account.profile.editTitle")}</p>
						<p className="auth-panel__hint">
							{t("account.profile.phoneChangeHint")}
						</p>
						<div className="account-profile-form__grid">
							<div className="auth-form__group">
								<label htmlFor="account-name" className="auth-form__label">
									{t("auth.common.name")}
								</label>
								<input
									id="account-name"
									name="name"
									defaultValue={data.user.name}
									required
									className="auth-form__field"
								/>
							</div>
							<div className="auth-form__group">
								<label htmlFor="account-phone" className="auth-form__label">
									{t("auth.common.phone")}
								</label>
								<input
									id="account-phone"
									name="phone"
									type="tel"
									defaultValue={data.user.phone}
									required
									className="auth-form__field"
								/>
							</div>
						</div>
						<div className="account-profile-form__actions">
							<button type="submit" className="auth-form__submit">
								{t("account.profile.saveSubmit")}
							</button>
						</div>
					</form>

					<form action={updateAccountEmailAction} className="account-profile-form">
						<p className="account-profile-form__title">{t("account.profile.changeEmailTitle")}</p>
						<p className="auth-panel__hint">
							{t("account.profile.emailChangeHint")}
						</p>
						<div className="account-profile-form__grid">
							<div className="auth-form__group">
								<label htmlFor="account-email" className="auth-form__label">
									{t("account.profile.newEmailLabel")}
								</label>
								<input
									id="account-email"
									name="email"
									type="email"
									defaultValue={data.user.pendingEmail ?? data.user.email}
									required
									className="auth-form__field"
								/>
							</div>
						</div>
						<div className="account-profile-form__actions">
							<button type="submit" className="auth-form__submit">
								{t("account.profile.sendEmailCodeSubmit")}
							</button>
						</div>
					</form>
				</article>

				<article className="account-card">
					<h2 className="account-card__title">{t("account.history.title")}</h2>
					<div className="account-stats">
						<div className="account-stats__item">
							<span className="account-stats__label">{t("account.history.activeAhead")}</span>
							<span className="account-stats__value">{data.totals.upcoming}</span>
						</div>
						<div className="account-stats__item">
							<span className="account-stats__label">{t("account.history.records")}</span>
							<span className="account-stats__value">{data.totals.history}</span>
						</div>
						<div className="account-stats__item">
							<span className="account-stats__label">{t("account.history.cancellableNow")}</span>
							<span className="account-stats__value">{data.totals.cancellable}</span>
						</div>
					</div>
					<p className="account-card__text">
						{t("account.history.description", { cancellationPolicySummary })}
					</p>
					<Link href="/account/bookings" className="account-card__link">
						{t("account.history.open")}
					</Link>
				</article>
			</section>
		</div>
	);
}
