import Link from "next/link";
import { PageHero } from "@/src/components/page-hero";
import { requireAuthenticatedUser } from "@/src/lib/auth/guards";
import { getAccountDashboardData } from "@/src/lib/account/bookings";
import { getSafeCustomerFreeCancellationHours } from "@/src/lib/bookings/policy";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const freeCancellationHours = getSafeCustomerFreeCancellationHours();
  const session = await requireAuthenticatedUser("/account");
  const data = await getAccountDashboardData(session.user.id);

  return (
    <div className="account-page">
      <PageHero
        eyebrow="Личный кабинет"
        title="Профиль клиента"
        description={`Профиль пользователя и сводка по бронированиям. Бесплатная отмена доступна не позднее чем за ${freeCancellationHours} часов до начала.`}
      />

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
              <dt className="account-profile__label">Роль</dt>
              <dd className="account-profile__value">{data.user.role}</dd>
            </div>
          </dl>
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
            Страница истории показывает реальные записи из БД, статусы оплаты и бесплатную отмену по правилу {freeCancellationHours} часов.
          </p>
          <Link href="/account/bookings" className="account-card__link">
            Открыть историю
          </Link>
        </article>
      </section>
    </div>
  );
}
