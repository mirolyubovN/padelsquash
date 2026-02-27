"use client";

import { useState } from "react";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);

  if (submittedEmail) {
    return (
      <div className="auth-panel__notice" role="status">
        <p>
          Если аккаунт с email <strong>{submittedEmail}</strong> существует, обратитесь к администратору клуба для
          сброса пароля.
        </p>
        <p className="auth-panel__hint">Телефон: +7 (727) 355-77-00. Также можно написать в WhatsApp клуба.</p>
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
        Запросить сброс
      </button>
    </form>
  );
}
