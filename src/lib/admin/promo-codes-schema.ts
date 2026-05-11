import { z } from "zod";

const codeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9_-]{3,32}$/, "Код должен содержать 3–32 символа: латинские буквы, цифры, _ и -");

const positiveDecimal = z.coerce.number().finite().positive("Должно быть положительным числом");
const nonnegativeInt = z.coerce
  .number()
  .int()
  .nonnegative("Должно быть 0 или больше")
  .optional()
  .nullable();

const promoCodeFields = z.object({
  code: codeSchema,
  description: z.string().trim().optional().nullable(),
  discountType: z.enum(["percent", "fixed_kzt"]),
  discountValue: positiveDecimal,
  maxDiscountKzt: z.coerce.number().positive().optional().nullable(),
  minOrderKzt: z.coerce.number().nonnegative().optional().nullable(),
  validFrom: z.string().date().optional().nullable(),
  validUntil: z.string().date().optional().nullable(),
  totalRedemptionLimit: nonnegativeInt,
  perCustomerLimit: nonnegativeInt,
  appliesToServiceCodes: z.array(z.string()).default([]),
  appliesToSportIds: z.array(z.string()).default([]),
  firstBookingOnly: z.boolean().default(false),
  status: z.enum(["active", "paused"]).default("active"),
});

export const createPromoCodeSchema = promoCodeFields
  .refine(
    (d) => !(d.discountType === "percent" && d.discountValue > 100),
    { message: "Процентная скидка не может превышать 100%", path: ["discountValue"] },
  )
  .refine(
    (d) => !(d.validFrom && d.validUntil && d.validFrom > d.validUntil),
    { message: "Дата окончания должна быть не раньше даты начала", path: ["validUntil"] },
  );

export const updatePromoCodeSchema = promoCodeFields
  .extend({ id: z.string().min(1) })
  .refine(
    (d) => !(d.discountType === "percent" && d.discountValue > 100),
    { message: "Процентная скидка не может превышать 100%", path: ["discountValue"] },
  )
  .refine(
    (d) => !(d.validFrom && d.validUntil && d.validFrom > d.validUntil),
    { message: "Дата окончания должна быть не раньше даты начала", path: ["validUntil"] },
  );

export const archivePromoCodeSchema = z.object({
  id: z.string().min(1),
});

export type CreatePromoCodeInput = z.infer<typeof createPromoCodeSchema>;
export type UpdatePromoCodeInput = z.infer<typeof updatePromoCodeSchema>;
