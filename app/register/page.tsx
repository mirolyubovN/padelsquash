import { PageHero } from "@/src/components/page-hero";
import { RegisterForm } from "@/src/components/auth/register-form";
import { getSafeCustomerFreeCancellationHours } from "@/src/lib/bookings/policy";

export const metadata = {
  title: "Регистрация | Padel & Squash KZ",
};

export const dynamic = "force-dynamic";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const freeCancellationHours = getSafeCustomerFreeCancellationHours();
  const params = await searchParams;
  const next = typeof params.next === "string" && params.next.startsWith("/") ? params.next : "/account";

  return (
    <div className="login-page">
      <PageHero
        eyebrow="Регистрация"
        title="Создать аккаунт клиента"
        description={`Аккаунт нужен для просмотра истории бронирований и бесплатной отмены по правилу ${freeCancellationHours} часов.`}
      />

      <section className="auth-panel" aria-labelledby="register-form-title">
        <div className="auth-panel__box">
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
