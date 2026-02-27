import { AuthError } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { signIn } from "@/auth";
import { LoginForm } from "@/src/components/auth/login-form";
import { PageHero } from "@/src/components/page-hero";
import { buildPageMetadata } from "@/src/lib/seo/metadata";

export const metadata = buildPageMetadata({
  title: "Вход | Padel & Squash KZ",
  description: "Войдите в аккаунт, чтобы подтвердить бронирование, посмотреть историю записей и управлять отменами в личном кабинете.",
  path: "/login",
  noIndex: true,
});

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  const next = typeof params.next === "string" && params.next.startsWith("/") ? params.next : "/account";
  const hasError = params.error === "credentials";

  async function loginAction(formData: FormData) {
    "use server";

    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");
    const nextValue = String(formData.get("next") ?? "/account");
    const safeNext = nextValue.startsWith("/") ? nextValue : "/account";

    try {
      await signIn("credentials", {
        email,
        password,
        redirectTo: safeNext,
      });
    } catch (error) {
      if (error instanceof AuthError) {
        redirect(`/login?error=credentials&next=${encodeURIComponent(safeNext)}`);
      }
      throw error;
    }
  }

  return (
    <div className="login-page">
      <PageHero
        eyebrow="Авторизация"
        title="Вход в систему"
        description="Войдите с email и паролем, чтобы управлять бронированиями и видеть историю занятий."
      />

      <section className="auth-panel" aria-labelledby="login-form-title">
        <div className="auth-panel__box">
          <div className="auth-panel__brand" aria-hidden="true">
            <span className="auth-panel__brand-mark">PS</span>
            <div>
              <p className="auth-panel__brand-title">Padel & Squash KZ</p>
              <p className="auth-panel__brand-subtitle">Личный кабинет и бронирования</p>
            </div>
          </div>

          <h2 id="login-form-title" className="auth-panel__title">
            Вход по email
          </h2>
          <p className="auth-panel__hint">
            Нет аккаунта?{" "}
            <Link href={`/register?next=${encodeURIComponent(next)}`} className="auth-panel__link">
              Зарегистрироваться
            </Link>
          </p>

          <LoginForm next={next} hasError={hasError} action={loginAction} />

          <div className="auth-panel__links">
            <Link href="/" className="auth-panel__link">
              На главную
            </Link>
            <Link href={`/register?next=${encodeURIComponent(next)}`} className="auth-panel__link">
              Регистрация клиента
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
