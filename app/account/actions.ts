"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAuthenticatedUser } from "@/src/lib/auth/guards";
import { prisma } from "@/src/lib/prisma";

const updateProfileSchema = z.object({
  name: z.string().trim().min(2, "Введите имя (минимум 2 символа)."),
  phone: z.string().trim().min(5, "Введите корректный телефон."),
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
