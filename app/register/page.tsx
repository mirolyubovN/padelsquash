import { PageHero } from "@/src/components/page-hero";
import { RegisterForm } from "@/src/components/auth/register-form";
import { getCustomerCancellationPolicySummary } from "@/src/lib/bookings/policy";
import { buildPageMetadata } from "@/src/lib/seo/metadata";

export const metadata = buildPageMetadata({
  title: "Регистрация | Padel & Squash KZ",
  description: "Создайте аккаунт для онлайн-бронирования кортов и тренировок, подтверждений записи и управления отменой в личном кабинете.",
  path: "/register",
  noIndex: true,
});

export const dynamic = "force-dynamic";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const cancellationPolicySummary = getCustomerCancellationPolicySummary();
  const params = await searchParams;
  const next = typeof params.next === "string" && params.next.startsWith("/") ? params.next : "/account";

  return (
    <div className="login-page">
      <PageHero
        eyebrow="Регистрация"
        title="Создать аккаунт клиента"
        description={`Аккаунт нужен для просмотра истории бронирований и управления отменами. ${cancellationPolicySummary}`}
      />

      <section className="auth-panel" aria-labelledby="register-form-title">
        <div className="auth-panel__box">
          <div className="auth-panel__brand" aria-hidden="true">
            <span className="auth-panel__brand-mark">PS</span>
            <div>
              <p className="auth-panel__brand-title">Padel & Squash KZ</p>
              <p className="auth-panel__brand-subtitle">Создание клиентского аккаунта</p>
            </div>
          </div>

          <h2 id="register-form-title" className="auth-panel__title">
            Регистрация клиента
          </h2>
          <p className="auth-panel__hint">
            Если вы уже создавали бронь с этим email, можно зарегистрироваться и получить доступ к истории.
          </p>

          <RegisterForm next={next} />
        </div>
      </section>
    </div>
  );
}
