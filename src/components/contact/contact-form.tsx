"use client";

import { useActionState } from "react";
import { submitContactFormAction } from "@/app/contact/actions";

type ContactFormState = {
  status: "idle" | "success" | "error";
  message: string | null;
  values: { name: string; phone: string; message: string };
  fieldErrors: Partial<Record<"name" | "phone" | "message", string>>;
};

const initialState: ContactFormState = {
  status: "idle" as const,
  message: null as string | null,
  values: { name: "", phone: "", message: "" },
  fieldErrors: {} as Partial<Record<"name" | "phone" | "message", string>>,
};

export function ContactForm({ title, description }: { title: string; description: string }) {
  const [state, formAction, isPending] = useActionState<ContactFormState, FormData>(
    submitContactFormAction as (state: ContactFormState, payload: FormData) => Promise<ContactFormState>,
    initialState,
  );

  return (
    <section className="contact-form" aria-labelledby="contact-form-title">
      <h2 id="contact-form-title" className="contact-form__title">
        {title}
      </h2>
      <p className="contact-form__text">
        {description}
      </p>

      {state.message ? (
        <p
          className={`contact-form__message contact-form__message--${state.status === "success" ? "success" : "error"}`}
          role="alert"
        >
          {state.message}
        </p>
      ) : null}

      <form action={formAction} className="contact-form__form" noValidate>
        <div className="auth-form__group">
          <label htmlFor="contact-name" className="auth-form__label">
            Имя
          </label>
          <input
            id="contact-name"
            name="name"
            defaultValue={state.values.name}
            className={`auth-form__field${state.fieldErrors.name ? " auth-form__field--error" : ""}`}
            aria-invalid={state.fieldErrors.name ? "true" : "false"}
          />
          {state.fieldErrors.name ? <p className="auth-form__field-error">{state.fieldErrors.name}</p> : null}
        </div>

        <div className="auth-form__group">
          <label htmlFor="contact-phone" className="auth-form__label">
            Телефон
          </label>
          <input
            id="contact-phone"
            name="phone"
            type="tel"
            defaultValue={state.values.phone}
            className={`auth-form__field${state.fieldErrors.phone ? " auth-form__field--error" : ""}`}
            aria-invalid={state.fieldErrors.phone ? "true" : "false"}
          />
          <p className="auth-form__hint">Формат: +7 (7XX) XXX-XX-XX</p>
          {state.fieldErrors.phone ? <p className="auth-form__field-error">{state.fieldErrors.phone}</p> : null}
        </div>

        <div className="auth-form__group">
          <label htmlFor="contact-message" className="auth-form__label">
            Сообщение
          </label>
          <textarea
            id="contact-message"
            name="message"
            rows={4}
            defaultValue={state.values.message}
            className={`auth-form__field contact-form__textarea${state.fieldErrors.message ? " auth-form__field--error" : ""}`}
            aria-invalid={state.fieldErrors.message ? "true" : "false"}
          />
          {state.fieldErrors.message ? (
            <p className="auth-form__field-error">{state.fieldErrors.message}</p>
          ) : null}
        </div>

        <button type="submit" className="contact-form__submit" disabled={isPending}>
          {isPending ? "Отправляем..." : "Отправить заявку"}
        </button>
      </form>
    </section>
  );
}
