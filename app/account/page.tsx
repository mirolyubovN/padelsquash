import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHero } from "@/src/components/page-hero";
import { AccountTabs } from "@/src/components/account/account-tabs";
import { topUpWalletAction, updateAccountProfileAction } from "@/app/account/actions";
import { requireAuthenticatedUser } from "@/src/lib/auth/guards";
import { getAccountDashboardData } from "@/src/lib/account/bookings";
import { getCustomerCancellationPolicySummary } from "@/src/lib/bookings/policy";
import { buildPageMetadata } from "@/src/lib/seo/metadata";
import { canAccessAdminPortal, getRoleLabel } from "@/src/lib/auth/roles";
import { formatMoneyKzt } from "@/src/lib/format/money";
import { getAccountWalletPageData } from "@/src/lib/wallet/queries";

export const metadata = buildPageMetadata({
  title: "Личный кабинет | Padel & Squash KZ",
  description: "Профиль клиента: личные данные, баланс, пополнение и быстрая сводка по бронированиям.",
  path: "/account",
  noIndex: true,
});

export const dynamic = "force-dynamic";

function getWalletTypeLabel(type: string): string {
  if (type === "topup") return "Пополнение";
  if (type === "bonus") return "Бонус";
  if (type === "admin_credit") return "Начисление админом";
  if (type === "admin_debit") return "Списание админом";
  if (type === "booking_charge") return "Оплата брони";
  if (type === "booking_refund") return "Возврат за бронь";
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
      ? "Профиль обновлен."
      : params.success === "wallet_topped_up"
        ? "Баланс пополнен."
        : null;
  const errorMessage =
    params.error === "profile_invalid"
      ? "Проверьте имя и телефон."
      : params.error === "wallet_invalid"
        ? "Укажите корректную сумму пополнения."
        : null;
  const returnAfterTopUp = params.next ? decodeURIComponent(params.next) : "";

  return (
    <div className="account-page">
      <PageHero
        eyebrow="Личный кабинет"
        title="Профиль клиента"
        description={`Профиль пользователя, баланс и сводка по бронированиям. ${cancellationPolicySummary}`}
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
          <h2 className="account-card__title">Баланс</h2>
          <div className="account-stats">
            <div className="account-stats__item">
              <span className="account-stats__label">Доступно сейчас</span>
              <span className="account-stats__value">{formatMoneyKzt(wallet.balanceKzt)}</span>
            </div>
            <div className="account-stats__item">
              <span className="account-stats__label">Бонус при пополнении</span>
              <span className="account-stats__value">
                {wallet.bonusSettings.active
                  ? `${wallet.bonusSettings.bonusPercent}% от ${formatMoneyKzt(wallet.bonusSettings.thresholdKzt)}`
                  : "Выключен"}
              </span>
            </div>
          </div>
          <p className="account-card__text">
            Все новые бронирования списываются с баланса автоматически. Если средств не хватает, сначала пополните счет.
          </p>
          {returnAfterTopUp ? (
            <p className="admin-bookings__cell-sub">После пополнения вы вернетесь к незавершенному бронированию.</p>
          ) : null}

          <form action={topUpWalletAction} className="account-profile-form">
            <input type="hidden" name="next" value={returnAfterTopUp} />
            <p className="account-profile-form__title">Пополнить баланс</p>
            <div className="account-profile-form__grid">
              <div className="auth-form__group">
                <label htmlFor="wallet-amount" className="auth-form__label">
                  Сумма, KZT
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
            <button type="submit" className="auth-form__submit">
              Пополнить баланс
            </button>
          </form>

          <div>
            <p className="account-profile-form__title">Последние операции</p>
            {wallet.transactions.length === 0 ? (
              <p className="account-card__text">Операций пока нет.</p>
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
                      {` · Баланс ${formatMoneyKzt(row.balanceAfterKzt)}`}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        </article>

        <article className="account-card">
          <h2 className="account-card__title">Профиль</h2>
          <dl className="account-profile__list">
            <div className="account-profile__item">
              <dt className="account-profile__label">Имя</dt>
              <dd className="account-profile__value">{data.user.name}</dd>
            </div>
            <div className="account-profile__item">
              <dt className="account-profile__label">Email</dt>
              <dd className="account-profile__value">{data.user.email}</dd>
            </div>
            <div className="account-profile__item">
              <dt className="account-profile__label">Телефон</dt>
              <dd className="account-profile__value">{data.user.phone}</dd>
            </div>
            <div className="account-profile__item">
              <dt className="account-profile__label">Тип аккаунта</dt>
              <dd className="account-profile__value">{roleLabel}</dd>
            </div>
          </dl>

          <form action={updateAccountProfileAction} className="account-profile-form">
            <p className="account-profile-form__title">Редактировать профиль</p>
            <div className="account-profile-form__grid">
              <div className="auth-form__group">
                <label htmlFor="account-name" className="auth-form__label">
                  Имя
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
                  Телефон
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
            <button type="submit" className="auth-form__submit">
              Сохранить профиль
            </button>
          </form>
        </article>

        <article className="account-card">
          <h2 className="account-card__title">История бронирований</h2>
          <div className="account-stats">
            <div className="account-stats__item">
              <span className="account-stats__label">Активные впереди</span>
              <span className="account-stats__value">{data.totals.upcoming}</span>
            </div>
            <div className="account-stats__item">
              <span className="account-stats__label">Записей в истории</span>
              <span className="account-stats__value">{data.totals.history}</span>
            </div>
            <div className="account-stats__item">
              <span className="account-stats__label">Можно отменить сейчас</span>
              <span className="account-stats__value">{data.totals.cancellable}</span>
            </div>
          </div>
          <p className="account-card__text">
            История ваших бронирований, статусы и правила отмены. {cancellationPolicySummary}
          </p>
          <Link href="/account/bookings" className="account-card__link">
            Открыть историю
          </Link>
        </article>
      </section>
    </div>
  );
}
