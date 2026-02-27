import Link from "next/link";
import { PageHero } from "@/src/components/page-hero";
import { AccountTabs } from "@/src/components/account/account-tabs";
import { updateAccountProfileAction } from "@/app/account/actions";
import { requireAuthenticatedUser } from "@/src/lib/auth/guards";
import { getAccountDashboardData } from "@/src/lib/account/bookings";
import { getSafeCustomerFreeCancellationHours } from "@/src/lib/bookings/policy";
import { buildPageMetadata } from "@/src/lib/seo/metadata";

export const metadata = buildPageMetadata({
  title: "Личный кабинет | Padel & Squash KZ",
  description: "Профиль клиента: личные данные, быстрая сводка по бронированиям и управление аккаунтом.",
  path: "/account",
  noIndex: true,
});

export const dynamic = "force-dynamic";

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const freeCancellationHours = getSafeCustomerFreeCancellationHours();
  const session = await requireAuthenticatedUser("/account");
  const params = await searchParams;
  const data = await getAccountDashboardData(session.user.id);
  const roleLabel =
    data.user.role === "admin" ? "Администратор" : data.user.role === "coach" ? "Тренер" : "Клиент";
  const successMessage = params.success === "profile_saved" ? "Профиль обновлен." : null;
  const errorMessage = params.error === "profile_invalid" ? "Проверьте имя и телефон." : null;

  return (
    <div className="account-page">
      <PageHero
        eyebrow="Личный кабинет"
        title="Профиль клиента"
        description={`Профиль пользователя и сводка по бронированиям. Бесплатная отмена доступна не позднее чем за ${freeCancellationHours} часов до начала.`}
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
            История ваших бронирований, статусы и возможность отмены по правилу {freeCancellationHours} часов.
          </p>
          <Link href="/account/bookings" className="account-card__link">
            Открыть историю
          </Link>
        </article>
      </section>
    </div>
  );
}
