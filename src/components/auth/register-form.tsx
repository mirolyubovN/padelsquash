"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { submitRegisterAction } from "@/app/register/actions";
import { createInitialRegisterFormState } from "@/src/lib/auth/register-form-state";

interface RegisterFormProps {
  next: string;
}

export function RegisterForm({ next }: RegisterFormProps) {
  const [state, formAction, isPending] = useActionState(
    submitRegisterAction,
    createInitialRegisterFormState(next),
  );
  const [showPasswords, setShowPasswords] = useState(false);

  return (
    <>
      {state.formError ? (
        <p className="auth-panel__error" role="alert">
          {state.formError}
        </p>
      ) : null}

      <form action={formAction} className="auth-form" noValidate>
        <input type="hidden" name="next" value={state.values.next} />

        <div className="auth-form__group">
          <label htmlFor="register-name" className="auth-form__label">
            Имя
          </label>
          <input
            id="register-name"
            name="name"
            required
            autoComplete="name"
            defaultValue={state.values.name}
            className={`auth-form__field${state.fieldErrors.name ? " auth-form__field--error" : ""}`}
            aria-invalid={state.fieldErrors.name ? "true" : "false"}
            aria-describedby={state.fieldErrors.name ? "register-name-error" : undefined}
          />
          {state.fieldErrors.name ? (
            <p id="register-name-error" className="auth-form__field-error" role="alert">
              {state.fieldErrors.name}
            </p>
          ) : null}
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
            defaultValue={state.values.email}
            className={`auth-form__field${state.fieldErrors.email ? " auth-form__field--error" : ""}`}
            aria-invalid={state.fieldErrors.email ? "true" : "false"}
            aria-describedby={state.fieldErrors.email ? "register-email-error" : undefined}
          />
          {state.fieldErrors.email ? (
            <p id="register-email-error" className="auth-form__field-error" role="alert">
              {state.fieldErrors.email}
            </p>
          ) : null}
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
            defaultValue={state.values.phone}
            className={`auth-form__field${state.fieldErrors.phone ? " auth-form__field--error" : ""}`}
            aria-invalid={state.fieldErrors.phone ? "true" : "false"}
            aria-describedby="register-phone-hint register-phone-error"
          />
          <p id="register-phone-hint" className="auth-form__hint">
            Формат: +7 (7XX) XXX-XX-XX
          </p>
          {state.fieldErrors.phone ? (
            <p id="register-phone-error" className="auth-form__field-error" role="alert">
              {state.fieldErrors.phone}
            </p>
          ) : null}
        </div>

        <div className="auth-form__group">
          <label htmlFor="register-password" className="auth-form__label">
            Пароль
          </label>
          <div className="auth-form__field-row">
            <input
              id="register-password"
              name="password"
              type={showPasswords ? "text" : "password"}
              autoComplete="new-password"
              minLength={8}
              required
              className={`auth-form__field auth-form__field--row${state.fieldErrors.password ? " auth-form__field--error" : ""}`}
              aria-invalid={state.fieldErrors.password ? "true" : "false"}
              aria-describedby={state.fieldErrors.password ? "register-password-error" : undefined}
            />
            <button
              type="button"
              className="auth-form__toggle"
              onClick={() => setShowPasswords((value) => !value)}
              aria-pressed={showPasswords}
            >
              {showPasswords ? "Скрыть" : "Показать"}
            </button>
          </div>
          {state.fieldErrors.password ? (
            <p id="register-password-error" className="auth-form__field-error" role="alert">
              {state.fieldErrors.password}
            </p>
          ) : null}
        </div>

        <div className="auth-form__group">
          <label htmlFor="register-password-confirm" className="auth-form__label">
            Повторите пароль
          </label>
          <div className="auth-form__field-row">
            <input
              id="register-password-confirm"
              name="passwordConfirm"
              type={showPasswords ? "text" : "password"}
              autoComplete="new-password"
              minLength={8}
              required
              className={`auth-form__field auth-form__field--row${state.fieldErrors.passwordConfirm ? " auth-form__field--error" : ""}`}
              aria-invalid={state.fieldErrors.passwordConfirm ? "true" : "false"}
              aria-describedby={state.fieldErrors.passwordConfirm ? "register-password-confirm-error" : undefined}
            />
            <button
              type="button"
              className="auth-form__toggle"
              onClick={() => setShowPasswords((value) => !value)}
              aria-pressed={showPasswords}
            >
              {showPasswords ? "Скрыть" : "Показать"}
            </button>
          </div>
          {state.fieldErrors.passwordConfirm ? (
            <p id="register-password-confirm-error" className="auth-form__field-error" role="alert">
              {state.fieldErrors.passwordConfirm}
            </p>
          ) : null}
        </div>

        <button
          type="submit"
          className={`auth-form__submit${isPending ? " auth-form__submit--loading" : ""}`}
          disabled={isPending}
        >
          {isPending ? "Создаем аккаунт..." : "Создать аккаунт"}
        </button>
        <p className="auth-form__hint">После регистрации нужно подтвердить email и телефон через Telegram-бота.</p>
      </form>

      <div className="auth-panel__links">
        <Link href={`/login?next=${encodeURIComponent(state.values.next)}`} className="auth-panel__link">
          Уже есть аккаунт? Войти
        </Link>
        <Link href="/" className="auth-panel__link">
          На главную
        </Link>
      </div>
    </>
  );
}
