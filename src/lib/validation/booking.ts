import { z } from "zod";

const fixedOneHourDurationSchema = z.coerce
  .number()
  .int()
  .refine((value) => value === 60, "Поддерживается только сессия 60 минут");

export const availabilityQuerySchema = z.object({
  serviceId: z.string().min(1, "serviceId обязателен"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date должен быть в формате YYYY-MM-DD"),
  durationMin: fixedOneHourDurationSchema.optional().default(60),
  instructorId: z.string().min(1).optional(),
});

export const createBookingSchema = z.object({
  customerId: z.string().min(1).optional(),
  serviceId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .refine((value) => {
      const minutes = Number(value.split(":")[1] ?? "0");
      return minutes === 0;
    }, "startTime должен быть на целый час (например, 09:00)"),
  durationMin: fixedOneHourDurationSchema.optional().default(60),
  courtId: z.string().optional(),
  instructorId: z.string().optional(),
  customer: z.object({
    name: z.string().min(1),
    email: z.string().email(),
    phone: z.string().min(5),
  }),
});

export const markPlaceholderPaidSchema = z.object({
  bookingId: z.string().min(1),
  paymentId: z.string().optional(),
});
