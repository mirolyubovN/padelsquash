"use server";

import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { z } from "zod";
import { signIn } from "@/auth";
import {
  createInitialRegisterFormState,
  getSafeRegisterNext,
  type RegisterFormState,
} from "@/src/lib/auth/register-form-state";
import { prisma } from "@/src/lib/prisma";

const registerSchema = z
  .object({
    name: z.string().trim().min(2, "Введите имя (минимум 2 символа)."),
    email: z.string().email("Введите корректный email."),
    phone: z.string().trim().min(5, "Введите корректный телефон."),
    password: z.string().min(8, "Пароль должен содержать минимум 8 символов."),
    passwordConfirm: z.string().min(8, "Повторите пароль (минимум 8 символов)."),
    next: z.string().optional(),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: "Пароли не совпадают.",
    path: ["passwordConfirm"],
  });

function buildErrorState(
  values: RegisterFormState["values"],
  formError: string,
  fieldErrors: RegisterFormState["fieldErrors"] = {},
): RegisterFormState {
  return {
    formError,
    fieldErrors,
    values,
  };
}

export async function submitRegisterAction(
  _prevState: RegisterFormState,
  formData: FormData,
): Promise<RegisterFormState> {
  const raw = {
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    password: String(formData.get("password") ?? ""),
    passwordConfirm: String(formData.get("passwordConfirm") ?? ""),
    next: String(formData.get("next") ?? "/account"),
  };

  const values = {
    name: raw.name.trim(),
    email: raw.email.trim(),
    phone: raw.phone.trim(),
    next: getSafeRegisterNext(raw.next),
  };

  const parsed = registerSchema.safeParse(raw);
  if (!parsed.success) {
    const flattened = parsed.error.flatten().fieldErrors;
    const fieldErrors: RegisterFormState["fieldErrors"] = {};

    for (const fieldName of ["name", "email", "phone", "password", "passwordConfirm"] as const) {
      const firstError = flattened[fieldName]?.[0];
      if (firstError) {
        fieldErrors[fieldName] = firstError;
      }
    }

    return buildErrorState(values, "Проверьте заполнение полей.", fieldErrors);
  }

  const safeNext = getSafeRegisterNext(parsed.data.next);
  const passwordHash = await bcrypt.hash(parsed.data.password, 10);

  try {
    const existing = await prisma.user.findUnique({
      where: { email: parsed.data.email },
    });

    if (existing) {
      if (existing.role !== "customer") {
        return buildErrorState(values, "Этот email занят сотрудником или администратором.");
      }

      const hasCredentialsPassword = existing.passwordHash.startsWith("$2");
      if (hasCredentialsPassword) {
        return buildErrorState(values, "Этот email уже зарегистрирован. Используйте вход.", {
          email: "Email уже зарегистрирован.",
        });
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

    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: safeNext,
    });

    return createInitialRegisterFormState(safeNext);
  } catch (error) {
    if (error instanceof AuthError) {
      return buildErrorState(values, "Аккаунт создан, но вход не выполнен. Войдите вручную.");
    }
    throw error;
  }
}
