import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const SEED_LOCATIONS = [
  {
    slug: "main" as const,
    name: "Padel & Squash KZ",
    address: "г. Алматы, ул. Абая, 120",
    phone: "+7 (727) 355-77-00",
    email: "info@padelsquash.kz",
    timezone: "Asia/Almaty",
    mapUrl:
      "https://www.google.com/maps/search/?api=1&query=%D0%90%D0%BB%D0%BC%D0%B0%D1%82%D1%8B%2C+%D1%83%D0%BB.+%D0%90%D0%B1%D0%B0%D1%8F%2C+120",
    sortOrder: 0,
    active: true,
  },
];

const SEED_SPORTS = [
  { slug: "padel" as const, name: "Падел", sortOrder: 10, active: true },
  { slug: "squash" as const, name: "Сквош", sortOrder: 20, active: true },
];

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

function makeDistinctEmail(email: string, suffix: string) {
  const atIndex = email.indexOf("@");
  if (atIndex < 0) {
    return `${email}-${suffix}`;
  }

  return `${email.slice(0, atIndex)}+${suffix}${email.slice(atIndex)}`;
}

async function main() {
  const superAdminEmail = process.env.SEED_SUPER_ADMIN_EMAIL ?? "admin@example.com";
  const superAdminPassword = process.env.SEED_SUPER_ADMIN_PASSWORD ?? "Admin123!";
  const superAdminName = process.env.SEED_SUPER_ADMIN_NAME ?? "Супер-админ";
  const superAdminPhone = process.env.SEED_SUPER_ADMIN_PHONE ?? "+77000000000";

  const adminEmailRaw = process.env.SEED_ADMIN_EMAIL ?? "manager@example.com";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "Manager123!";
  const adminName = process.env.SEED_ADMIN_NAME ?? "Администратор";
  const adminPhone = process.env.SEED_ADMIN_PHONE ?? "+77000000001";

  const trainerEmailRaw = process.env.SEED_TRAINER_EMAIL ?? "trainer@example.com";
  const trainerPassword = process.env.SEED_TRAINER_PASSWORD ?? "Trainer123!";
  const trainerName = process.env.SEED_TRAINER_NAME ?? "Тренер";
  const trainerPhone = process.env.SEED_TRAINER_PHONE ?? "+77000000002";

  const customerEmailRaw = process.env.SEED_CUSTOMER_EMAIL ?? "customer@example.com";
  const customerPassword = process.env.SEED_CUSTOMER_PASSWORD ?? "Customer123!";
  const customerName = process.env.SEED_CUSTOMER_NAME ?? "Клиент";
  const customerPhone = process.env.SEED_CUSTOMER_PHONE ?? "+77000000003";

  const superAdminEmailLower = superAdminEmail.toLowerCase();
  const adminEmail =
    adminEmailRaw.toLowerCase() === superAdminEmailLower
      ? makeDistinctEmail(adminEmailRaw, "ops")
      : adminEmailRaw;
  const trainerEmail =
    trainerEmailRaw.toLowerCase() === superAdminEmailLower || trainerEmailRaw.toLowerCase() === adminEmail.toLowerCase()
      ? makeDistinctEmail(trainerEmailRaw, "trainer")
      : trainerEmailRaw;
  const customerEmail =
    customerEmailRaw.toLowerCase() === superAdminEmailLower ||
    customerEmailRaw.toLowerCase() === adminEmail.toLowerCase() ||
    customerEmailRaw.toLowerCase() === trainerEmail.toLowerCase()
      ? makeDistinctEmail(customerEmailRaw, "customer")
      : customerEmailRaw;

  const [superAdminPasswordHash, adminPasswordHash, trainerPasswordHash, customerPasswordHash] = await Promise.all([
    bcrypt.hash(superAdminPassword, 10),
    bcrypt.hash(adminPassword, 10),
    bcrypt.hash(trainerPassword, 10),
    bcrypt.hash(customerPassword, 10),
  ]);

  await prisma.$transaction(async (tx) => {
    await tx.payment.deleteMany();
    await tx.bookingResource.deleteMany();
    await tx.booking.deleteMany();
    await tx.componentPrice.deleteMany();
    await tx.scheduleException.deleteMany();
    await tx.resourceSchedule.deleteMany();
    await tx.openingHour.deleteMany();
    await tx.instructorLocation.deleteMany();
    await tx.instructorSport.deleteMany();
    await tx.service.deleteMany();
    await tx.instructor.deleteMany();
    await tx.court.deleteMany();
    await tx.sport.deleteMany();
    await tx.location.deleteMany();
    await tx.user.deleteMany({
      where: {
        email: {
          in: [superAdminEmail, adminEmail, trainerEmail, customerEmail],
        },
      },
    });

    await tx.user.create({
      data: {
        name: superAdminName,
        email: superAdminEmail,
        phone: superAdminPhone,
        passwordHash: superAdminPasswordHash,
        role: "super_admin",
      },
    });

    await tx.user.create({
      data: {
        name: adminName,
        email: adminEmail,
        phone: adminPhone,
        passwordHash: adminPasswordHash,
        role: "admin",
      },
    });

    await tx.location.createMany({ data: SEED_LOCATIONS });
    const locations = await tx.location.findMany({
      where: { slug: { in: SEED_LOCATIONS.map((location) => location.slug) } },
      select: { id: true, slug: true },
    });
    const locationIdBySlug = Object.fromEntries(
      locations.map((location) => [location.slug, location.id]),
    ) as Record<string, string>;
    const mainLocationId = locationIdBySlug.main;
    if (!mainLocationId) {
      throw new Error("Не найден основной location main после seed");
    }

    await tx.sport.createMany({ data: SEED_SPORTS });
    const sports = await tx.sport.findMany({
      where: {
        slug: {
          in: SEED_SPORTS.map((sport) => sport.slug),
        },
      },
      select: {
        id: true,
        slug: true,
      },
    });
    const sportIdBySlug = Object.fromEntries(sports.map((sport) => [sport.slug, sport.id])) as Record<string, string>;

    await tx.court.createMany({
      data: SEED_COURTS.map((court) => ({
        name: court.name,
        sportId: sportIdBySlug[court.sport],
        locationId: mainLocationId,
        active: court.active,
      })),
    });

    const instructors = await Promise.all(
      SEED_INSTRUCTORS.map((instructor) =>
        tx.instructor.create({
          data: {
            name: instructor.name,
            bio: instructor.bio,
            active: instructor.active,
            instructorSports: {
              create: instructor.sports.map((sport) => ({
                sportId: sportIdBySlug[sport],
                pricePerHour: instructor.pricePerHour,
              })),
            },
            instructorLocations: {
              create: {
                locationId: mainLocationId,
                active: true,
              },
            },
          },
          select: { id: true },
        }),
      ),
    );
    const trainerInstructorId = instructors[0]?.id;
    if (!trainerInstructorId) {
      throw new Error("Не удалось определить instructor для seeded пользователя trainer.");
    }

    await tx.user.create({
      data: {
        name: trainerName,
        email: trainerEmail,
        phone: trainerPhone,
        passwordHash: trainerPasswordHash,
        role: "trainer",
        instructorId: trainerInstructorId,
      },
    });

    await tx.user.create({
      data: {
        name: customerName,
        email: customerEmail,
        phone: customerPhone,
        passwordHash: customerPasswordHash,
        role: "customer",
      },
    });

    await tx.service.createMany({
      data: SEED_SERVICES.map((service) => ({
        code: service.code,
        name: service.name,
        sportId: sportIdBySlug[service.sport],
        requiresCourt: service.requiresCourt,
        requiresInstructor: service.requiresInstructor,
        active: service.active,
      })),
    });

    await tx.componentPrice.createMany({
      data: SEED_COURT_COMPONENT_PRICES.map((row) => ({
        locationId: mainLocationId,
        sportId: sportIdBySlug[row.sport],
        componentType: "court" as const,
        period: row.period,
        currency: "KZT",
        amount: row.amount,
      })),
    });

    await tx.openingHour.createMany({
      data: SEED_OPENING_HOURS.map((row) => ({
        locationId: mainLocationId,
        dayOfWeek: row.dayOfWeek,
        openTime: row.openTime,
        closeTime: row.closeTime,
        active: row.active,
      })),
    });

    await tx.resourceSchedule.createMany({
      data: buildInstructorScheduleRows(instructors),
    });
  });

  console.log(
    [
      `Seed complete.`,
      `Super admin: ${superAdminEmail} / ${superAdminPassword}`,
      `Admin: ${adminEmail} / ${adminPassword}`,
      `Trainer: ${trainerEmail} / ${trainerPassword}`,
      `Customer: ${customerEmail} / ${customerPassword}`,
    ].join("\n"),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
