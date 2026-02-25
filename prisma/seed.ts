import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const SEED_COURTS = [
  { name: "Падел 1", sport: "padel" as const, active: true },
  { name: "Падел 2", sport: "padel" as const, active: true },
  { name: "Падел 3", sport: "padel" as const, active: true },
  { name: "Сквош 1", sport: "squash" as const, active: true },
  { name: "Сквош 2", sport: "squash" as const, active: true },
];

const SEED_INSTRUCTORS = [
  {
    name: "Илья Смирнов",
    sports: ["padel"] as const,
    bio: "Тренер по паделу: постановка техники, игровые связки и уверенная парная игра.",
    pricePerHour: "11500.00",
    active: true,
  },
  {
    name: "Руслан Алимов",
    sports: ["padel"] as const,
    bio: "Падел: тактика пары, вариативная подача, матч-практика для продолжающих.",
    pricePerHour: "13500.00",
    active: true,
  },
  {
    name: "Анна Коваль",
    sports: ["squash"] as const,
    bio: "Сквош: техника, перемещения и контроль темпа для начинающих и продолжающих.",
    pricePerHour: "9500.00",
    active: true,
  },
  {
    name: "Данияр Сеитов",
    sports: ["squash"] as const,
    bio: "Сквош: индивидуальные занятия, спарринги и подготовка к любительским турнирам.",
    pricePerHour: "11000.00",
    active: true,
  },
  {
    name: "Алексей Нуртаев",
    sports: ["padel", "squash"] as const,
    bio: "Универсальный тренер: вводные занятия и базовая техника по паделу и сквошу.",
    pricePerHour: "12000.00",
    active: true,
  },
];

const SEED_SERVICES = [
  {
    code: "padel-rental",
    name: "Аренда корта (падел)",
    sport: "padel" as const,
    requiresCourt: true,
    requiresInstructor: false,
    active: true,
  },
  {
    code: "padel-coaching",
    name: "Тренировка с тренером (падел)",
    sport: "padel" as const,
    requiresCourt: true,
    requiresInstructor: true,
    active: true,
  },
  {
    code: "squash-rental",
    name: "Аренда корта (сквош)",
    sport: "squash" as const,
    requiresCourt: true,
    requiresInstructor: false,
    active: true,
  },
  {
    code: "squash-coaching",
    name: "Тренировка с тренером (сквош)",
    sport: "squash" as const,
    requiresCourt: true,
    requiresInstructor: true,
    active: true,
  },
];

const SEED_COURT_COMPONENT_PRICES = [
  { sport: "padel" as const, period: "morning" as const, amount: "12000.00" },
  { sport: "padel" as const, period: "day" as const, amount: "12000.00" },
  { sport: "padel" as const, period: "evening_weekend" as const, amount: "17000.00" },
  { sport: "squash" as const, period: "morning" as const, amount: "7000.00" },
  { sport: "squash" as const, period: "day" as const, amount: "7000.00" },
  { sport: "squash" as const, period: "evening_weekend" as const, amount: "10000.00" },
];

const SEED_OPENING_HOURS = [
  { dayOfWeek: 0, openTime: "08:00", closeTime: "23:00", active: true },
  { dayOfWeek: 1, openTime: "08:00", closeTime: "23:00", active: true },
  { dayOfWeek: 2, openTime: "08:00", closeTime: "23:00", active: true },
  { dayOfWeek: 3, openTime: "08:00", closeTime: "23:00", active: true },
  { dayOfWeek: 4, openTime: "08:00", closeTime: "23:00", active: true },
  { dayOfWeek: 5, openTime: "08:00", closeTime: "23:00", active: true },
  { dayOfWeek: 6, openTime: "08:00", closeTime: "23:00", active: true },
];

function buildInstructorScheduleRows(instructors: Array<{ id: string }>) {
  return instructors.flatMap((instructor) =>
    [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
      resourceType: "instructor" as const,
      resourceId: instructor.id,
      dayOfWeek,
      startTime: "08:00",
      endTime: "23:00",
      active: true,
    })),
  );
}

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@example.com";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "Admin123!";
  const adminName = process.env.SEED_ADMIN_NAME ?? "Администратор";
  const adminPhone = process.env.SEED_ADMIN_PHONE ?? "+77000000000";
  const passwordHash = await bcrypt.hash(adminPassword, 10);

  await prisma.$transaction(async (tx) => {
    await tx.payment.deleteMany();
    await tx.bookingResource.deleteMany();
    await tx.booking.deleteMany();
    await tx.componentPrice.deleteMany();
    await tx.scheduleException.deleteMany();
    await tx.resourceSchedule.deleteMany();
    await tx.openingHour.deleteMany();
    await tx.service.deleteMany();
    await tx.instructor.deleteMany();
    await tx.court.deleteMany();
    await tx.user.deleteMany({
      where: {
        email: {
          in: [adminEmail],
        },
      },
    });

    await tx.user.create({
      data: {
        name: adminName,
        email: adminEmail,
        phone: adminPhone,
        passwordHash,
        role: "admin",
      },
    });

    await tx.court.createMany({ data: SEED_COURTS });

    const instructors = await Promise.all(
      SEED_INSTRUCTORS.map((instructor) =>
        tx.instructor.create({
          data: {
            name: instructor.name,
            sports: [...instructor.sports],
            bio: instructor.bio,
            pricePerHour: instructor.pricePerHour,
            active: instructor.active,
          },
        }),
      ),
    );

    await tx.service.createMany({ data: SEED_SERVICES });

    await tx.componentPrice.createMany({
      data: SEED_COURT_COMPONENT_PRICES.map((row) => ({
        sport: row.sport,
        componentType: "court" as const,
        period: row.period,
        currency: "KZT",
        amount: row.amount,
      })),
    });

    await tx.openingHour.createMany({ data: SEED_OPENING_HOURS });

    await tx.resourceSchedule.createMany({
      data: buildInstructorScheduleRows(instructors),
    });
  });

  console.log(`Seed complete. Admin: ${adminEmail} / ${adminPassword}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
