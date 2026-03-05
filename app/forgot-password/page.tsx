import Link from "next/link";
import { PageHero } from "@/src/components/page-hero";
import { ForgotPasswordForm } from "@/src/components/auth/forgot-password-form";
import { buildPageMetadata } from "@/src/lib/seo/metadata";

export const metadata = buildPageMetadata({
  title: "Сброс пароля | Padel & Squash KZ",
  description: "Страница восстановления доступа к аккаунту: оставьте email и получите инструкции для связи с администратором клуба.",
  path: "/forgot-password",
  noIndex: true,
});

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  const next = typeof params.next === "string" && params.next.startsWith("/") ? params.next : "/login";

  return (
    <div className="login-page">
      <PageHero
        eyebrow="Восстановление доступа"
        title="Сброс пароля"
        description="Оставьте email, и мы подскажем, как восстановить доступ к вашему аккаунту."
      />

      <section className="auth-panel" aria-labelledby="forgot-password-title">
        <div className="auth-panel__box">
          <div className="auth-panel__brand" aria-hidden="true">
            <span className="auth-panel__brand-mark">PS</span>
            <div>
              <p className="auth-panel__brand-title">Padel & Squash KZ</p>
              <p className="auth-panel__brand-subtitle">Помощь с доступом</p>
            </div>
          </div>

          <h2 id="forgot-password-title" className="auth-panel__title">
            Восстановление пароля
          </h2>
          <p className="auth-panel__hint">
            Используйте форму ниже, и мы направим вас к администратору клуба.
          </p>

          <ForgotPasswordForm />

          <div className="auth-panel__links">
            <Link href={`/login?next=${encodeURIComponent(next)}`} className="auth-panel__link">
              Вернуться ко входу
            </Link>
            <Link href="/" className="auth-panel__link">
              На главную
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
