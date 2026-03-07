import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { signIn } from "@/auth";
import { PageHero } from "@/src/components/page-hero";
import { verifyAccountSetupToken, userNeedsPasswordSetup } from "@/src/lib/auth/account-setup";
import { getSafeRegisterNext } from "@/src/lib/auth/register-form-state";
import { prisma } from "@/src/lib/prisma";
import { buildPageMetadata } from "@/src/lib/seo/metadata";

export const metadata = buildPageMetadata({
  title: "Активация аккаунта | Padel & Squash KZ",
  description: "Задайте пароль для доступа в личный кабинет клиента.",
  path: "/activate-account",
  noIndex: true,
});

export const dynamic = "force-dynamic";

async function getActivationUser(token: string | undefined) {
  if (!token) {
    return null;
  }

  const [encodedPayload] = token.split(".");
  if (!encodedPayload) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as { uid?: string };
    if (!payload.uid) {
      return null;
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.uid },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        passwordHash: true,
      },
    });

    if (!user || !userNeedsPasswordSetup(user.passwordHash)) {
      return null;
    }

    const verified = verifyAccountSetupToken({
      token,
      email: user.email,
      passwordHash: user.passwordHash,
    });

    if (!verified || verified.userId !== user.id) {
      return null;
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      expiresAt: verified.expiresAt,
    };
  } catch {
    return null;
  }
}

function buildActivationErrorMessage(error: string | undefined): string | null {
  if (error === "password_length") {
    return "Пароль должен содержать минимум 8 символов.";
  }
  if (error === "password_mismatch") {
    return "Пароли не совпадают.";
  }
  if (error === "invalid_token") {
    return "Ссылка активации недействительна или уже использована.";
  }
  return null;
}

export default async function ActivateAccountPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; next?: string; error?: string }>;
}) {
  const params = await searchParams;
  const token = typeof params.token === "string" ? params.token : undefined;
  const next = getSafeRegisterNext(params.next);
  const activationUser = await getActivationUser(token);
  const errorMessage = buildActivationErrorMessage(params.error);

  async function completeActivationAction(formData: FormData) {
    "use server";

    const formToken = String(formData.get("token") ?? "");
    const nextPath = getSafeRegisterNext(String(formData.get("next") ?? "/account"));
    const password = String(formData.get("password") ?? "");
    const passwordConfirm = String(formData.get("passwordConfirm") ?? "");

    if (password.length < 8) {
      redirect(`/activate-account?token=${encodeURIComponent(formToken)}&next=${encodeURIComponent(nextPath)}&error=password_length`);
    }

    if (password !== passwordConfirm) {
      redirect(`/activate-account?token=${encodeURIComponent(formToken)}&next=${encodeURIComponent(nextPath)}&error=password_mismatch`);
    }

    const user = await getActivationUser(formToken);
    if (!user) {
      redirect(`/activate-account?error=invalid_token&next=${encodeURIComponent(nextPath)}`);
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    try {
      await signIn("credentials", {
        email: user.email,
        password,
        redirectTo: nextPath,
      });
    } catch (error) {
      if (error instanceof AuthError) {
        redirect(`/login?next=${encodeURIComponent(nextPath)}`);
      }
      throw error;
    }
  }

  return (
    <div className="login-page">
      <PageHero
        eyebrow="Активация"
        title="Задайте пароль для аккаунта"
        description="После установки пароля вы сможете входить в личный кабинет и управлять своими бронированиями."
      />

      <section className="auth-panel" aria-labelledby="activate-account-title">
        <div className="auth-panel__box">
          <div className="auth-panel__brand" aria-hidden="true">
            <span className="auth-panel__brand-mark">PS</span>
            <div>
              <p className="auth-panel__brand-title">Padel & Squash KZ</p>
              <p className="auth-panel__brand-subtitle">Доступ к личному кабинету</p>
            </div>
          </div>

          <h2 id="activate-account-title" className="auth-panel__title">
            Активация аккаунта
          </h2>

          {errorMessage ? (
            <p className="auth-panel__error" role="alert">
              {errorMessage}
            </p>
          ) : null}

          {!activationUser ? (
            <>
              <p className="auth-panel__hint">
                Ссылка недействительна, истекла или уже была использована. Запросите новую ссылку у администратора клуба.
              </p>
              <div className="auth-panel__links">
                <Link href="/login" className="auth-panel__link">
                  Ко входу
                </Link>
                <Link href="/" className="auth-panel__link">
                  На главную
                </Link>
              </div>
            </>
          ) : (
            <>
              <div className="auth-form__group">
                <label className="auth-form__label">Клиент</label>
                <div className="auth-form__field" aria-readonly="true">{activationUser.name}</div>
              </div>
              <div className="auth-form__group">
                <label className="auth-form__label">Email</label>
                <div className="auth-form__field" aria-readonly="true">{activationUser.email}</div>
              </div>
              <div className="auth-form__group">
                <label className="auth-form__label">Телефон</label>
                <div className="auth-form__field" aria-readonly="true">{activationUser.phone}</div>
              </div>
              <p className="auth-panel__hint">
                Ссылка действует до {activationUser.expiresAt.toLocaleString("ru-KZ")}.
              </p>

              <form action={completeActivationAction} className="auth-form">
                <input type="hidden" name="token" value={token} />
                <input type="hidden" name="next" value={next} />

                <div className="auth-form__group">
                  <label htmlFor="activate-password" className="auth-form__label">
                    Пароль
                  </label>
                  <input
                    id="activate-password"
                    name="password"
                    type="password"
                    minLength={8}
                    autoComplete="new-password"
                    required
                    className="auth-form__field"
                  />
                </div>

                <div className="auth-form__group">
                  <label htmlFor="activate-password-confirm" className="auth-form__label">
                    Повторите пароль
                  </label>
                  <input
                    id="activate-password-confirm"
                    name="passwordConfirm"
                    type="password"
                    minLength={8}
                    autoComplete="new-password"
                    required
                    className="auth-form__field"
                  />
                </div>

                <button type="submit" className="auth-form__submit">
                  Активировать аккаунт
                </button>
              </form>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
