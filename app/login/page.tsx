import { AuthError } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { signIn } from "@/auth";
import { PageHero } from "@/src/components/page-hero";

export const metadata = {
  title: "Вход | Padel & Squash KZ",
};

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  const next = typeof params.next === "string" && params.next.startsWith("/") ? params.next : "/admin";
  const hasError = params.error === "credentials";

  async function loginAction(formData: FormData) {
    "use server";

    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");
    const nextValue = String(formData.get("next") ?? "/admin");

    try {
      await signIn("credentials", {
        email,
        password,
        redirectTo: nextValue.startsWith("/") ? nextValue : "/admin",
      });
    } catch (error) {
      if (error instanceof AuthError) {
        redirect("/login?error=credentials");
      }
      throw error;
    }
  }

  return (
    <div className="login-page">
      <PageHero
        eyebrow="Авторизация"
        title="Вход в систему"
        description="Войдите с email и паролем. Админ-раздел доступен только пользователям с ролью admin."
      />

      <section className="auth-panel" aria-labelledby="login-form-title">
        <div className="auth-panel__box">
          <h2 id="login-form-title" className="auth-panel__title">
            Вход по email
          </h2>
          <p className="auth-panel__hint">
            Для теста после `db:seed`: `admin@example.com` / `Admin123!`. Клиенты могут зарегистрироваться отдельно.
          </p>

          {hasError ? (
            <p className="auth-panel__error" role="alert">
              Неверный email или пароль.
            </p>
          ) : null}

          <form action={loginAction} className="auth-form">
            <input type="hidden" name="next" value={next} />

            <div className="auth-form__group">
              <label htmlFor="login-email" className="auth-form__label">
                Email
              </label>
              <input
                id="login-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="auth-form__field"
              />
            </div>

            <div className="auth-form__group">
              <label htmlFor="login-password" className="auth-form__label">
                Пароль
              </label>
              <input
                id="login-password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="auth-form__field"
              />
            </div>

            <button type="submit" className="auth-form__submit">
              Войти
            </button>
          </form>

          <div className="auth-panel__links">
            <Link href="/" className="auth-panel__link">
              На главную
            </Link>
            <Link href={`/register?next=${encodeURIComponent(next)}`} className="auth-panel__link">
              Регистрация клиента
            </Link>
            <Link href="/admin" className="auth-panel__link">
              В админ-панель
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
