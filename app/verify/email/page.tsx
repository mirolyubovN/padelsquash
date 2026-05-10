import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AuthPanel, AuthPanelLinks } from "@/src/components/auth/auth-panel";
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
  const verifiedUserId = verification.status === "invalid" ? null : verification.userId;
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
  const session = await auth();

  if (fullyVerified && (session?.user?.id === verifiedUserId || session?.user?.email === verifiedEmail)) {
    redirect(next);
  }

  return (
    <div className="login-page">
      <PageHero
        eyebrow="Регистрация"
        title="Подтверждение email"
        description="Email подтвержден. Если телефон еще не подтвержден, завершите подтверждение через Telegram."
      />

      <AuthPanel title="Результат подтверждения" titleId="verify-email-title" showBrand={false}>
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

        <AuthPanelLinks>
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
        </AuthPanelLinks>
      </AuthPanel>
    </div>
  );
}
