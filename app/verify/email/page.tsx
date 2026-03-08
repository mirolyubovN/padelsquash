import Link from "next/link";
import { PageHero } from "@/src/components/page-hero";
import { getSafeRegisterNext } from "@/src/lib/auth/register-form-state";
import { consumeEmailVerificationToken } from "@/src/lib/auth/verification";
import { buildPageMetadata } from "@/src/lib/seo/metadata";

export const metadata = buildPageMetadata({
  title: "Подтверждение email | Padel & Squash KZ",
  description: "Статус подтверждения email для регистрации.",
  path: "/verify/email",
  noIndex: true,
});

export const dynamic = "force-dynamic";

function normalizeEmail(email: string | undefined): string {
  return (email ?? "").trim().toLowerCase();
}

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; email?: string; next?: string }>;
}) {
  const params = await searchParams;
  const token = String(params.token ?? "").trim();
  const email = normalizeEmail(params.email);
  const next = getSafeRegisterNext(params.next);
  const verification = token ? await consumeEmailVerificationToken(token) : { status: "invalid" as const };

  const verifiedEmail = verification.status === "invalid" ? email : verification.email;
  const canContinueVerification = Boolean(verifiedEmail);

  const successMessage =
    verification.status === "verified"
      ? "Email подтвержден."
      : verification.status === "already_used"
        ? "Эта ссылка уже была использована."
        : null;

  const errorMessage =
    verification.status === "invalid"
      ? "Ссылка подтверждения недействительна."
      : verification.status === "expired"
        ? "Срок действия ссылки истек."
        : null;

  const fullyVerified =
    verification.status === "verified" || verification.status === "already_used" || verification.status === "expired"
      ? verification.fullyVerified
      : false;

  return (
    <div className="login-page">
      <PageHero
        eyebrow="Регистрация"
        title="Подтверждение email"
        description="Email подтвержден. Если телефон еще не подтвержден, завершите подтверждение через Telegram."
      />

      <section className="auth-panel" aria-labelledby="verify-email-title">
        <div className="auth-panel__box">
          <h2 id="verify-email-title" className="auth-panel__title">
            Результат подтверждения
          </h2>

          {successMessage ? (
            <p className="account-history__message account-history__message--success" role="status">
              {successMessage}
            </p>
          ) : null}
          {errorMessage ? (
            <p className="auth-panel__error" role="alert">
              {errorMessage}
            </p>
          ) : null}

          <div className="auth-panel__links">
            {canContinueVerification ? (
              <Link
                href={`/register/verify?email=${encodeURIComponent(verifiedEmail)}&next=${encodeURIComponent(next)}`}
                className="auth-panel__link"
              >
                {fullyVerified ? "Проверить статус аккаунта" : "Продолжить подтверждение"}
              </Link>
            ) : null}
            {fullyVerified ? (
              <Link href={`/login?next=${encodeURIComponent(next)}`} className="auth-panel__link">
                Войти в аккаунт
              </Link>
            ) : null}
            <Link href="/" className="auth-panel__link">
              На главную
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
