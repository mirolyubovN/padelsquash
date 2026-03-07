"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAuthenticatedUser } from "@/src/lib/auth/guards";
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

export async function updateAccountProfileAction(formData: FormData) {
  const session = await requireAuthenticatedUser("/account");

  const parsed = updateProfileSchema.safeParse({
    name: String(formData.get("name") ?? ""),
    phone: String(formData.get("phone") ?? ""),
  });

  if (!parsed.success) {
    redirect("/account?error=profile_invalid");
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      name: parsed.data.name,
      phone: parsed.data.phone,
    },
  });

  revalidatePath("/account");
  revalidatePath("/account/bookings");
  redirect("/account?success=profile_saved");
}

export async function topUpWalletAction(formData: FormData) {
  const session = await requireAuthenticatedUser("/account");

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
