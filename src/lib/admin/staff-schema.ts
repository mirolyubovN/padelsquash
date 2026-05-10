import { z } from "zod";

export const staffRoleSchema = z.enum(["admin", "super_admin", "trainer"]);
export const staffAdminRoleSchema = z.enum(["admin", "super_admin"]);
export const passwordModeSchema = z.enum(["activation_link", "manual"]);
export const instructorModeSchema = z.enum(["link_existing", "create_new"]);

const passwordSchema = z
  .string()
  .min(8, "Пароль должен быть не короче 8 символов.")
  .regex(/[a-zа-я]/i, "Пароль должен содержать буквы.")
  .regex(/[A-ZА-Я]/, "Пароль должен содержать заглавную букву.")
  .regex(/\d/, "Пароль должен содержать цифру.");

const optionalMoneySchema = z.coerce
  .number()
  .finite()
  .nonnegative("Ставка не может быть отрицательной.");

export const newInstructorSchema = z.object({
  name: z.string().trim().optional(),
  bio: z.string().trim().optional(),
  sportPrices: z
    .array(
      z.object({
        sportId: z.string().trim().min(1),
        pricePerHour: optionalMoneySchema,
      }),
    )
    .default([]),
  locationIds: z.array(z.string().trim().min(1)).default([]),
});

export const createStaffSchema = z
  .object({
    name: z.string().trim().min(2, "Укажите имя сотрудника."),
    email: z.string().trim().toLowerCase().email("Укажите корректный email."),
    phone: z.string().trim().min(3, "Укажите телефон."),
    role: staffRoleSchema,
    passwordMode: passwordModeSchema.default("activation_link"),
    password: z.string().optional(),
    instructorMode: instructorModeSchema.optional(),
    instructorId: z.string().trim().optional(),
    newInstructor: newInstructorSchema.optional(),
  })
  .superRefine((value, ctx) => {
    if (value.passwordMode === "manual") {
      const parsed = passwordSchema.safeParse(value.password ?? "");
      if (!parsed.success) {
        for (const issue of parsed.error.issues) {
          ctx.addIssue({ ...issue, path: ["password"] });
        }
      }
    }

    if (value.role !== "trainer") {
      return;
    }

    if (value.instructorMode === "link_existing") {
      if (!value.instructorId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["instructorId"],
          message: "Выберите карточку тренера.",
        });
      }
      return;
    }

    if (value.instructorMode === "create_new") {
      if (!value.newInstructor?.sportPrices.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["newInstructor", "sportPrices"],
          message: "Выберите хотя бы один вид спорта для тренера.",
        });
      }
      if (!value.newInstructor?.locationIds.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["newInstructor", "locationIds"],
          message: "Выберите хотя бы одну локацию для тренера.",
        });
      }
      return;
    }

    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["instructorMode"],
      message: "Укажите способ привязки карточки тренера.",
    });
  });

export const updateStaffSchema = z.object({
  userId: z.string().trim().min(1),
  name: z.string().trim().min(2, "Укажите имя сотрудника."),
  email: z.string().trim().toLowerCase().email("Укажите корректный email."),
  phone: z.string().trim().min(3, "Укажите телефон."),
});

export const setStaffActiveSchema = z.object({
  userId: z.string().trim().min(1),
  active: z.boolean(),
});

export const changeStaffRoleSchema = z.object({
  userId: z.string().trim().min(1),
  role: staffAdminRoleSchema,
});

export const relinkTrainerInstructorSchema = z.object({
  userId: z.string().trim().min(1),
  instructorId: z.string().trim().min(1).nullable(),
});

export type StaffRole = z.infer<typeof staffRoleSchema>;
export type StaffAdminRole = z.infer<typeof staffAdminRoleSchema>;
export type CreateStaffInput = z.infer<typeof createStaffSchema>;
export type UpdateStaffInput = z.infer<typeof updateStaffSchema>;
