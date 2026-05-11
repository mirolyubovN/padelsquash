"use client";

import { useState } from "react";
import { t } from "@/src/lib/i18n";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);

  if (submittedEmail) {
    return (
      <div className="auth-panel__notice" role="status">
        <p>
          {t("auth.forgotPassword.submittedMessage", { email: submittedEmail })}
        </p>
        <p className="auth-panel__hint">{t("auth.forgotPassword.contactHint")}</p>
      </div>
    );
  }

  return (
    <form
      className="auth-form"
      onSubmit={(event) => {
        event.preventDefault();
        if (!email.trim()) return;
        setSubmittedEmail(email.trim());
      }}
    >
      <div className="auth-form__group">
        <label htmlFor="forgot-password-email" className="auth-form__label">
          Email
        </label>
        <input
          id="forgot-password-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="auth-form__field"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </div>

      <button type="submit" className="auth-form__submit">
        {t("auth.forgotPassword.submit")}
      </button>
    </form>
  );
}
