"use client";

import Link from "next/link";
import { useState } from "react";
import { useFormStatus } from "react-dom";

interface LoginFormProps {
  next: string;
  hasError: boolean;
  action: (formData: FormData) => void | Promise<void>;
}

function LoginSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      className={`auth-form__submit${pending ? " auth-form__submit--loading" : ""}`}
      disabled={pending}
    >
      {pending ? "Входим..." : "Войти"}
    </button>
  );
}

export function LoginForm({ next, hasError, action }: LoginFormProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <>
      {hasError ? (
        <p className="auth-panel__error" role="alert">
          Неверный email или пароль.
        </p>
      ) : null}

      <form action={action} className="auth-form">
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
          <div className="auth-form__field-row">
            <input
              id="login-password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              className="auth-form__field auth-form__field--row"
            />
            <button
              type="button"
              className="auth-form__toggle"
              onClick={() => setShowPassword((value) => !value)}
              aria-pressed={showPassword}
            >
              {showPassword ? "Скрыть" : "Показать"}
            </button>
          </div>
        </div>

        <div className="auth-form__actions-row">
          <Link href={`/forgot-password?next=${encodeURIComponent(next)}`} className="auth-panel__link">
            Забыли пароль?
          </Link>
        </div>

        <LoginSubmitButton />
      </form>
    </>
  );
}
