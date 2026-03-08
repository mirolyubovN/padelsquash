import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHero } from "@/src/components/page-hero";
import { getSafeRegisterNext } from "@/src/lib/auth/register-form-state";
import {
  getActivePhoneVerificationSession,
  isCustomerFullyVerified,
  issueEmailVerification,
  issuePhoneVerificationSession,
} from "@/src/lib/auth/verification";
import { buildPageMetadata } from "@/src/lib/seo/metadata";
import { prisma } from "@/src/lib/prisma";

export const metadata = buildPageMetadata({
  title: "Подтверждение регистрации | Padel & Squash KZ",
  description: "Подтвердите email и телефон, чтобы завершить регистрацию и войти в личный кабинет.",
  path: "/register/verify",
  noIndex: true,
});

export const dynamic = "force-dynamic";

function normalizeEmail(email: string | undefined): string {
  return (email ?? "").trim().toLowerCase();
}

export default async function RegisterVerifyPage({
  searchParams,
}: {
  searchParams: Promise<{
    email?: string;
    next?: string;
    emailDelivery?: string;
    telegramSetup?: string;
    resent?: string;
  }>;
}) {
  const params = await searchParams;
  const email = normalizeEmail(params.email);
  const next = getSafeRegisterNext(params.next);

  const customer = email
    ? await prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          emailVerifiedAt: true,
          phoneVerifiedAt: true,
        },
      })
    : null;

  const customerToVerify = customer && customer.role === "customer" ? customer : null;
  const canVerifyCustomer = Boolean(customerToVerify);
  const fullyVerified = customerToVerify ? isCustomerFullyVerified(customerToVerify) : false;

  const phoneSession =
    customerToVerify && !customerToVerify.phoneVerifiedAt
      ? (await getActivePhoneVerificationSession(customerToVerify.id)) ??
        (await issuePhoneVerificationSession({ userId: customerToVerify.id }))
      : null;

  async function resendEmailAction(formData: FormData) {
    "use server";

    const formEmail = normalizeEmail(String(formData.get("email") ?? ""));
    const nextPath = getSafeRegisterNext(String(formData.get("next") ?? "/account"));
    if (!formEmail) {
      redirect(`/register/verify?next=${encodeURIComponent(nextPath)}`);
    }

    const user = await prisma.user.findUnique({
      where: { email: formEmail },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        emailVerifiedAt: true,
      },
    });

    if (!user || user.role !== "customer") {
      redirect(`/register/verify?email=${encodeURIComponent(formEmail)}&next=${encodeURIComponent(nextPath)}`);
    }

    if (!user.emailVerifiedAt) {
      const result = await issueEmailVerification({
        userId: user.id,
        email: user.email,
        name: user.name,
        nextPath,
      });

      const qs = new URLSearchParams({
        email: formEmail,
        next: nextPath,
        resent: result.sent ? "email" : "email_failed",
      });
      redirect(`/register/verify?${qs.toString()}`);
    }

    redirect(`/register/verify?email=${encodeURIComponent(formEmail)}&next=${encodeURIComponent(nextPath)}&resent=email_already_verified`);
  }

  async function resendPhoneAction(formData: FormData) {
    "use server";

    const formEmail = normalizeEmail(String(formData.get("email") ?? ""));
    const nextPath = getSafeRegisterNext(String(formData.get("next") ?? "/account"));
    if (!formEmail) {
      redirect(`/register/verify?next=${encodeURIComponent(nextPath)}`);
    }

    const user = await prisma.user.findUnique({
      where: { email: formEmail },
      select: {
        id: true,
        role: true,
        phoneVerifiedAt: true,
      },
    });

    if (!user || user.role !== "customer") {
      redirect(`/register/verify?email=${encodeURIComponent(formEmail)}&next=${encodeURIComponent(nextPath)}`);
    }

    if (!user.phoneVerifiedAt) {
      await issuePhoneVerificationSession({ userId: user.id });
      redirect(`/register/verify?email=${encodeURIComponent(formEmail)}&next=${encodeURIComponent(nextPath)}&resent=phone`);
    }

    redirect(`/register/verify?email=${encodeURIComponent(formEmail)}&next=${encodeURIComponent(nextPath)}&resent=phone_already_verified`);
  }

  return (
    <div className="login-page">
      <PageHero
        eyebrow="Регистрация"
        title="Подтвердите email и телефон"
        description="Для входа в аккаунт нужно завершить оба шага: подтверждение email и подтверждение телефона через Telegram-бота."
      />

      <section className="auth-panel" aria-labelledby="register-verify-title">
        <div className="auth-panel__box">
          <h2 id="register-verify-title" className="auth-panel__title">
            Статус подтверждения
          </h2>

          {!canVerifyCustomer ? (
            <>
              <p className="auth-panel__error" role="alert">
                Аккаунт для подтверждения не найден. Проверьте email или зарегистрируйтесь заново.
              </p>
              <div className="auth-panel__links">
                <Link href={`/register?next=${encodeURIComponent(next)}`} className="auth-panel__link">
                  К регистрации
                </Link>
                <Link href="/login" className="auth-panel__link">
                  Ко входу
                </Link>
              </div>
            </>
          ) : (
            <>
              {params.emailDelivery === "failed" ? (
                <p className="auth-panel__error" role="alert">
                  Письмо не удалось отправить автоматически. Используйте кнопку повторной отправки или обратитесь к администратору.
                </p>
              ) : null}
              {params.telegramSetup === "missing" ? (
                <p className="auth-panel__error" role="alert">
                  Telegram-бот не настроен в окружении. Обратитесь к администратору.
                </p>
              ) : null}
              {params.resent === "email" ? (
                <p className="auth-panel__hint">Письмо отправлено повторно.</p>
              ) : null}
              {params.resent === "email_failed" ? (
                <p className="auth-panel__error" role="alert">
                  Повторная отправка письма не удалась.
                </p>
              ) : null}
              {params.resent === "phone" ? (
                <p className="auth-panel__hint">Ссылка Telegram обновлена.</p>
              ) : null}

              <dl className="account-profile__list">
                <div className="account-profile__item">
                  <dt className="account-profile__label">Email</dt>
                  <dd className="account-profile__value">
                    {customerToVerify!.email} {customerToVerify!.emailVerifiedAt ? "· подтвержден" : "· не подтвержден"}
                  </dd>
                </div>
                <div className="account-profile__item">
                  <dt className="account-profile__label">Телефон</dt>
                  <dd className="account-profile__value">
                    {customerToVerify!.phone} {customerToVerify!.phoneVerifiedAt ? "· подтвержден" : "· не подтвержден"}
                  </dd>
                </div>
              </dl>

              {!customerToVerify!.emailVerifiedAt ? (
                <form action={resendEmailAction} className="auth-form">
                  <input type="hidden" name="email" value={customerToVerify!.email} />
                  <input type="hidden" name="next" value={next} />
                  <button type="submit" className="auth-form__submit">
                    Отправить письмо подтверждения
                  </button>
                </form>
              ) : null}

              {!customerToVerify!.phoneVerifiedAt ? (
                <div className="auth-form">
                  {phoneSession?.telegramUrl ? (
                    <a href={phoneSession.telegramUrl} className="auth-form__submit">
                      Открыть Telegram-бота для подтверждения телефона
                    </a>
                  ) : (
                    <p className="auth-panel__error" role="alert">
                      Telegram-ссылка недоступна. Попробуйте обновить страницу.
                    </p>
                  )}

                  <form action={resendPhoneAction}>
                    <input type="hidden" name="email" value={customerToVerify!.email} />
                    <input type="hidden" name="next" value={next} />
                    <button type="submit" className="admin-bookings__action-button">
                      Обновить Telegram-ссылку
                    </button>
                  </form>
                </div>
              ) : null}

              {fullyVerified ? (
                <p className="account-history__message account-history__message--success" role="status">
                  Аккаунт подтвержден. Теперь можно войти.
                </p>
              ) : (
                <p className="auth-panel__hint">
                  После завершения обоих шагов вход в аккаунт станет доступен.
                </p>
              )}

              <div className="auth-panel__links">
                <Link href={`/login?next=${encodeURIComponent(next)}`} className="auth-panel__link">
                  Войти
                </Link>
                <Link href="/" className="auth-panel__link">
                  На главную
                </Link>
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
