import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { z } from "zod";
import { signIn } from "@/auth";
import { PageHero } from "@/src/components/page-hero";
import { getSafeCustomerFreeCancellationHours } from "@/src/lib/bookings/policy";
import { prisma } from "@/src/lib/prisma";

export const metadata = {
  title: "Регистрация | Padel & Squash KZ",
};

export const dynamic = "force-dynamic";

const registerSchema = z
  .object({
    name: z.string().trim().min(2),
    email: z.string().email(),
    phone: z.string().trim().min(5),
    password: z.string().min(8),
    passwordConfirm: z.string().min(8),
    next: z.string().optional(),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: "Пароли не совпадают",
    path: ["passwordConfirm"],
  });

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const freeCancellationHours = getSafeCustomerFreeCancellationHours();
  const params = await searchParams;
  const next = typeof params.next === "string" && params.next.startsWith("/") ? params.next : "/account";

  const errorMessage =
    params.error === "validation"
      ? "Проверьте заполнение полей (email, телефон, пароль от 8 символов)."
      : params.error === "exists"
        ? "Этот email уже зарегистрирован. Используйте вход."
        : params.error === "reserved"
          ? "Этот email занят сотрудником/администратором."
          : params.error === "auth"
            ? "Аккаунт создан, но автоматический вход не удался. Выполните вход вручную."
            : params.error === "failed"
              ? "Не удалось создать аккаунт."
              : null;

  async function registerAction(formData: FormData) {
    "use server";

    const raw = {
      name: String(formData.get("name") ?? ""),
      email: String(formData.get("email") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      password: String(formData.get("password") ?? ""),
      passwordConfirm: String(formData.get("passwordConfirm") ?? ""),
      next: String(formData.get("next") ?? "/account"),
    };

    const parsed = registerSchema.safeParse(raw);
    if (!parsed.success) {
      redirect(`/register?error=validation&next=${encodeURIComponent(next)}`);
    }

    const safeNext = parsed.data.next && parsed.data.next.startsWith("/") ? parsed.data.next : "/account";
    const passwordHash = await bcrypt.hash(parsed.data.password, 10);

    const existing = await prisma.user.findUnique({
      where: { email: parsed.data.email },
    });

    if (existing) {
      if (existing.role !== "customer") {
        redirect(`/register?error=reserved&next=${encodeURIComponent(safeNext)}`);
      }

      const hasCredentialsPassword = existing.passwordHash.startsWith("$2");
      if (hasCredentialsPassword) {
        redirect(`/register?error=exists&next=${encodeURIComponent(safeNext)}`);
      }

      await prisma.user.update({
        where: { id: existing.id },
        data: {
          name: parsed.data.name,
          phone: parsed.data.phone,
          passwordHash,
        },
      });
    } else {
      await prisma.user.create({
        data: {
          name: parsed.data.name,
          email: parsed.data.email,
          phone: parsed.data.phone,
          passwordHash,
          role: "customer",
        },
      });
    }

    try {
      await signIn("credentials", {
        email: parsed.data.email,
        password: parsed.data.password,
        redirectTo: safeNext,
      });
    } catch (error) {
      if (error instanceof AuthError) {
        redirect(`/login?next=${encodeURIComponent(safeNext)}&error=credentials`);
      }
      throw error;
    }
  }

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

          {errorMessage ? (
            <p className="auth-panel__error" role="alert">
              {errorMessage}
            </p>
          ) : null}

          <form action={registerAction} className="auth-form">
            <input type="hidden" name="next" value={next} />

            <div className="auth-form__group">
              <label htmlFor="register-name" className="auth-form__label">
                Имя
              </label>
              <input id="register-name" name="name" required className="auth-form__field" />
            </div>

            <div className="auth-form__group">
              <label htmlFor="register-email" className="auth-form__label">
                Email
              </label>
              <input
                id="register-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="auth-form__field"
              />
            </div>

            <div className="auth-form__group">
              <label htmlFor="register-phone" className="auth-form__label">
                Телефон
              </label>
              <input
                id="register-phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                required
                className="auth-form__field"
              />
            </div>

            <div className="auth-form__group">
              <label htmlFor="register-password" className="auth-form__label">
                Пароль
              </label>
              <input
                id="register-password"
                name="password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
                className="auth-form__field"
              />
            </div>

            <div className="auth-form__group">
              <label htmlFor="register-password-confirm" className="auth-form__label">
                Повторите пароль
              </label>
              <input
                id="register-password-confirm"
                name="passwordConfirm"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
                className="auth-form__field"
              />
            </div>

            <button type="submit" className="auth-form__submit">
              Создать аккаунт
            </button>
          </form>

          <div className="auth-panel__links">
            <Link href={`/login?next=${encodeURIComponent(next)}`} className="auth-panel__link">
              Уже есть аккаунт? Войти
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
