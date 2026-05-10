"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAuthenticatedUser } from "@/src/lib/auth/guards";
import { canAccessAdminPortal } from "@/src/lib/auth/roles";
import { issueEmailVerificationCode, issuePhoneVerificationSession } from "@/src/lib/auth/verification";
import { prisma } from "@/src/lib/prisma";
import { creditUserWallet } from "@/src/lib/wallet/service";

const updateProfileSchema = z.object({
  name: z.string().trim().min(2, "Введите имя (минимум 2 символа)."),
  phone: z.string().trim().min(5, "Введите корректный телефон."),
});

const topUpWalletSchema = z.object({
  amountKzt: z.coerce.number().int().positive(),
  next: z.string().trim().optional(),
});

const updateEmailSchema = z.object({
  email: z.string().trim().email("Введите корректный email.").transform((value) => value.toLowerCase()),
});

export async function updateAccountProfileAction(formData: FormData) {
  const session = await requireAuthenticatedUser("/account");
  if (canAccessAdminPortal(session.user.role)) {
    redirect("/admin");
  }

  const parsed = updateProfileSchema.safeParse({
    name: String(formData.get("name") ?? ""),
    phone: String(formData.get("phone") ?? ""),
  });

  if (!parsed.success) {
    redirect("/account?error=profile_invalid");
  }

  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      phone: true,
    },
  });
  if (!currentUser) {
    redirect("/login?next=/account");
  }

  const phoneChanged = parsed.data.phone !== currentUser.phone;
  await prisma.user.update({
    where: { id: currentUser.id },
    data: phoneChanged
      ? {
          name: parsed.data.name,
          pendingPhone: parsed.data.phone,
          phoneVerifiedAt: null,
          telegramChatId: null,
          telegramUsername: null,
        }
      : {
          name: parsed.data.name,
        },
  });

  revalidatePath("/account");
  revalidatePath("/account/bookings");

  if (phoneChanged) {
    const result = await issuePhoneVerificationSession({
      userId: currentUser.id,
      targetPhone: parsed.data.phone,
      purpose: "phone_change",
    });
    const params = new URLSearchParams({
      email: currentUser.email,
      next: "/account",
      success: "phone_update_requested",
    });
    if (!result.telegramUrl) {
      params.set("telegramSetup", "missing");
    }
    redirect(`/register/verify?${params.toString()}`);
  }

  redirect("/account?success=profile_saved");
}

export async function updateAccountEmailAction(formData: FormData) {
  const session = await requireAuthenticatedUser("/account");
  if (canAccessAdminPortal(session.user.role)) {
    redirect("/admin");
  }

  const parsed = updateEmailSchema.safeParse({
    email: String(formData.get("email") ?? ""),
  });

  if (!parsed.success) {
    redirect("/account?error=email_invalid");
  }

  const nextEmail = parsed.data.email;
  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      pendingEmail: true,
    },
  });

  if (!currentUser) {
    redirect("/login?next=/account");
  }

  if (nextEmail === currentUser.email && !currentUser.pendingEmail) {
    redirect("/account?success=email_unchanged");
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: nextEmail },
    select: { id: true },
  });
  if (existingUser && existingUser.id !== currentUser.id) {
    redirect("/account?error=email_taken");
  }

  await prisma.user.update({
    where: { id: currentUser.id },
    data: {
      pendingEmail: nextEmail,
      emailVerifiedAt: null,
    },
  });

  const result = await issueEmailVerificationCode({
    userId: currentUser.id,
    email: nextEmail,
    name: currentUser.name,
    nextPath: "/account",
    purpose: "email_change",
  });

  revalidatePath("/account");
  revalidatePath("/account/bookings");

  const params = new URLSearchParams({
    email: currentUser.email,
    next: "/account",
    success: "email_update_requested",
  });
  if (!result.sent) {
    params.set("emailDelivery", "failed");
  }

  redirect(`/register/verify?${params.toString()}`);
}

export async function topUpWalletAction(formData: FormData) {
  const session = await requireAuthenticatedUser("/account");
  if (canAccessAdminPortal(session.user.role)) {
    redirect("/admin/wallet");
  }

  const parsed = topUpWalletSchema.safeParse({
    amountKzt: formData.get("amountKzt"),
    next: String(formData.get("next") ?? "").trim() || undefined,
  });

  if (!parsed.success) {
    redirect("/account?error=wallet_invalid");
  }

  await creditUserWallet({
    userId: session.user.id,
    amountKzt: parsed.data.amountKzt,
    type: "topup",
    note: "Пополнение баланса",
    metadataJson: {
      source: "customer_topup_form",
    },
  });

  revalidatePath("/account");
  revalidatePath("/account/bookings");
  revalidatePath("/book");

  const safeNext = parsed.data.next?.startsWith("/") ? parsed.data.next : undefined;
  if (safeNext) {
    redirect(safeNext);
  }

  redirect("/account?success=wallet_topped_up");
}
