import { prisma } from "@/src/lib/prisma";
import { creditUserWallet } from "@/src/lib/wallet/service";

export function nextWeekdayIsoDate(minDaysAhead = 2): string {
  const date = new Date();
  date.setDate(date.getDate() + minDaysAhead);
  while (date.getDay() === 0 || date.getDay() === 6) {
    date.setDate(date.getDate() + 1);
  }
  return formatIsoDate(date);
}

export function addDaysIsoDate(dateIso: string, days: number): string {
  const date = new Date(`${dateIso}T00:00:00`);
  date.setDate(date.getDate() + days);
  return formatIsoDate(date);
}

function formatIsoDate(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}@example.com`;
}

export async function createCustomerWithWallet(prefix: string, balanceKzt = 200_000) {
  const user = await prisma.user.create({
    data: {
      name: `Test ${prefix}`,
      email: uniqueEmail(prefix),
      phone: "+77070009999",
      passwordHash: "test-password-hash",
      role: "customer",
    },
    select: {
      id: true,
      email: true,
      phone: true,
      name: true,
    },
  });

  await creditUserWallet({
    userId: user.id,
    amountKzt: balanceKzt,
    applyBonus: false,
    note: "Integration test wallet funding",
    metadataJson: {
      source: "integration_test",
    },
  });

  return user;
}

export async function getSeededPadelRentalService() {
  const service = await prisma.service.findUnique({ where: { code: "padel-rental" } });
  if (!service) {
    throw new Error("Не найдена seeded услуга padel-rental. Запустите npm run db:seed");
  }
  return service;
}

export async function getSeededPadelTrainingService() {
  const service = await prisma.service.findUnique({ where: { code: "padel-coaching" } });
  if (!service) {
    throw new Error("Не найдена seeded услуга padel-coaching. Запустите npm run db:seed");
  }
  return service;
}

export async function getSeededPadelCourts(limit = 2) {
  const courts = await prisma.court.findMany({
    where: { active: true, sport: { slug: "padel" } },
    orderBy: { name: "asc" },
    take: limit,
  });
  if (courts.length < limit) {
    throw new Error(`Ожидалось минимум ${limit} падел-корта в seed`);
  }
  return courts;
}

export async function getSeededPadelInstructors(limit = 2) {
  const instructors = await prisma.instructor.findMany({
    where: {
      active: true,
      instructorSports: {
        some: {
          sport: { slug: "padel" },
        },
      },
    },
    orderBy: { name: "asc" },
    take: limit,
    select: {
      id: true,
      name: true,
      instructorSports: {
        where: { sport: { slug: "padel" } },
        select: { pricePerHour: true },
        take: 1,
      },
    },
  });
  if (instructors.length < limit) {
    throw new Error(`Ожидалось минимум ${limit} падел-тренера в seed`);
  }
  return instructors.map((instructor) => ({
    id: instructor.id,
    name: instructor.name,
    pricePerHour: Number(instructor.instructorSports[0]?.pricePerHour ?? 0),
  }));
}
