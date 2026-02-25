export type RegisterFieldName = "name" | "email" | "phone" | "password" | "passwordConfirm";

export interface RegisterFormState {
  formError: string | null;
  fieldErrors: Partial<Record<RegisterFieldName, string>>;
  values: {
    name: string;
    email: string;
    phone: string;
    next: string;
  };
}

function sanitizeNext(nextValue: string | null | undefined): string {
  return typeof nextValue === "string" && nextValue.startsWith("/") ? nextValue : "/account";
}

export function getSafeRegisterNext(nextValue: string | null | undefined): string {
  return sanitizeNext(nextValue);
}

export function createInitialRegisterFormState(next: string): RegisterFormState {
  const safeNext = sanitizeNext(next);
  return {
    formError: null,
    fieldErrors: {},
    values: {
      name: "",
      email: "",
      phone: "",
      next: safeNext,
    },
  };
}
