"use client";

import Link from "next/link";
import { useState } from "react";
import { FormSubmitButton } from "@/src/components/ui/form-submit-button";
import { t } from "@/src/lib/i18n";

interface LoginFormProps {
  next: string;
  errorCode?: "credentials";
  action: (formData: FormData) => void | Promise<void>;
}

export function LoginForm({ next, errorCode, action }: LoginFormProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <>
      {errorCode ? (
        <p className="auth-panel__error" role="alert">
          {t("auth.login.error.credentials")}
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
            {t("auth.common.password")}
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
              {showPassword ? t("auth.common.hidePassword") : t("auth.common.showPassword")}
            </button>
          </div>
        </div>

        <div className="auth-form__actions-row">
          <Link href={`/forgot-password?next=${encodeURIComponent(next)}`} className="auth-panel__link">
            {t("auth.login.forgotPasswordLink")}
          </Link>
        </div>

        <FormSubmitButton
          className="auth-form__submit"
          label={t("auth.login.submit")}
          loadingLabel={t("auth.login.submitting")}
        />
      </form>
    </>
  );
}
