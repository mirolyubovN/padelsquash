"use server";

import { z } from "zod";

const contactFormSchema = z.object({
  name: z.string().trim().min(2, "Введите имя."),
  phone: z.string().trim().min(5, "Введите телефон."),
  message: z.string().trim().min(10, "Сообщение должно быть не короче 10 символов."),
});

export async function submitContactFormAction(
  _prevState: {
    status: "idle" | "success" | "error";
    message: string | null;
    values: { name: string; phone: string; message: string };
    fieldErrors: Partial<Record<"name" | "phone" | "message", string>>;
  },
  formData: FormData,
) {
  const raw = {
    name: String(formData.get("name") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    message: String(formData.get("message") ?? ""),
  };

  const values = {
    name: raw.name.trim(),
    phone: raw.phone.trim(),
    message: raw.message.trim(),
  };

  const parsed = contactFormSchema.safeParse(raw);
  if (!parsed.success) {
    const flattened = parsed.error.flatten().fieldErrors;
    return {
      status: "error" as const,
      message: "Проверьте поля формы.",
      values,
      fieldErrors: {
        name: flattened.name?.[0],
        phone: flattened.phone?.[0],
        message: flattened.message?.[0],
      },
    };
  }

  return {
    status: "success" as const,
    message: "Заявка отправлена. Администратор свяжется с вами в ближайшее время.",
    values: { name: "", phone: "", message: "" },
    fieldErrors: {},
  };
}
