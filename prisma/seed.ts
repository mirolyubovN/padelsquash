import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

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

    await tx.court.createMany({
      data: [
        { name: "Падел 1", sport: "padel", active: true },
        { name: "Падел 2", sport: "padel", active: true },
        { name: "Падел 3", sport: "padel", active: true },
        { name: "Сквош 1", sport: "squash", active: true },
        { name: "Сквош 2", sport: "squash", active: true },
      ],
    });

    const instructors = await Promise.all([
      tx.instructor.create({
        data: {
          name: "Илья Смирнов",
          sport: "padel",
          bio: "Тренер по паделу, постановка техники и игровые связки.",
          priceMorning: "9000.00",
          priceDay: "10000.00",
          priceEveningWeekend: "11500.00",
          active: true,
        },
      }),
      tx.instructor.create({
        data: {
          name: "Руслан Алимов",
          sport: "padel",
          bio: "Падел: игровые комбинации, парная тактика, продвинутый уровень.",
          priceMorning: "11000.00",
          priceDay: "12000.00",
          priceEveningWeekend: "13500.00",
          active: true,
        },
      }),
      tx.instructor.create({
        data: {
          name: "Анна Коваль",
          sport: "squash",
          bio: "Тренер по сквошу, индивидуальные и парные тренировки.",
          priceMorning: "7000.00",
          priceDay: "8000.00",
          priceEveningWeekend: "9500.00",
          active: true,
        },
      }),
      tx.instructor.create({
        data: {
          name: "Данияр Сеитов",
          sport: "squash",
          bio: "Сквош: техника, выносливость и турнирная подготовка.",
          priceMorning: "8500.00",
          priceDay: "9500.00",
          priceEveningWeekend: "11000.00",
          active: true,
        },
      }),
    ]);

    const services = await Promise.all([
      tx.service.create({
        data: {
          code: "padel-rental",
          name: "Аренда корта (падел)",
          sport: "padel",
          requiresCourt: true,
          requiresInstructor: false,
          active: true,
        },
      }),
      tx.service.create({
        data: {
          code: "padel-coaching",
          name: "Тренировка с тренером (падел)",
          sport: "padel",
          requiresCourt: true,
          requiresInstructor: true,
          active: true,
        },
      }),
      tx.service.create({
        data: {
          code: "squash-rental",
          name: "Аренда корта (сквош)",
          sport: "squash",
          requiresCourt: true,
          requiresInstructor: false,
          active: true,
        },
      }),
      tx.service.create({
        data: {
          code: "squash-coaching",
          name: "Тренировка с тренером (сквош)",
          sport: "squash",
          requiresCourt: true,
          requiresInstructor: true,
          active: true,
        },
      }),
    ]);

    void services;

    await tx.componentPrice.createMany({
      data: [
        { sport: "padel", componentType: "court", period: "morning", currency: "KZT", amount: "12000.00" },
        { sport: "padel", componentType: "court", period: "day", currency: "KZT", amount: "14000.00" },
        { sport: "padel", componentType: "court", period: "evening_weekend", currency: "KZT", amount: "17000.00" },
        { sport: "padel", componentType: "instructor", period: "morning", currency: "KZT", amount: "9000.00" },
        { sport: "padel", componentType: "instructor", period: "day", currency: "KZT", amount: "10000.00" },
        { sport: "padel", componentType: "instructor", period: "evening_weekend", currency: "KZT", amount: "11000.00" },
        { sport: "squash", componentType: "court", period: "morning", currency: "KZT", amount: "10000.00" },
        { sport: "squash", componentType: "court", period: "day", currency: "KZT", amount: "12000.00" },
        { sport: "squash", componentType: "court", period: "evening_weekend", currency: "KZT", amount: "15000.00" },
        { sport: "squash", componentType: "instructor", period: "morning", currency: "KZT", amount: "7000.00" },
        { sport: "squash", componentType: "instructor", period: "day", currency: "KZT", amount: "8000.00" },
        { sport: "squash", componentType: "instructor", period: "evening_weekend", currency: "KZT", amount: "9000.00" },
      ],
    });

    await tx.openingHour.createMany({
      data: [
        { dayOfWeek: 0, openTime: "08:00", closeTime: "22:00", active: true },
        { dayOfWeek: 1, openTime: "07:00", closeTime: "23:00", active: true },
        { dayOfWeek: 2, openTime: "07:00", closeTime: "23:00", active: true },
        { dayOfWeek: 3, openTime: "07:00", closeTime: "23:00", active: true },
        { dayOfWeek: 4, openTime: "07:00", closeTime: "23:00", active: true },
        { dayOfWeek: 5, openTime: "07:00", closeTime: "23:00", active: true },
        { dayOfWeek: 6, openTime: "08:00", closeTime: "22:00", active: true },
      ],
    });

    const instructorScheduleData = instructors.flatMap((instructor) =>
      [1, 2, 3, 4, 5, 6, 0].map((dayOfWeek) => ({
        resourceType: "instructor" as const,
        resourceId: instructor.id,
        dayOfWeek,
        startTime: dayOfWeek === 0 ? "10:00" : "09:00",
        endTime: dayOfWeek === 0 ? "20:00" : "21:00",
        active: true,
      })),
    );

    await tx.resourceSchedule.createMany({
      data: instructorScheduleData,
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
