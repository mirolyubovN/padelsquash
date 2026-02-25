import { afterAll, describe, expect, it } from "vitest";
import { createBookingInDb } from "@/src/lib/bookings/persistence";
import { prisma } from "@/src/lib/prisma";
import {
  getSeededPadelCourts,
  getSeededPadelInstructors,
  getSeededPadelRentalService,
  getSeededPadelTrainingService,
  nextWeekdayIsoDate,
  uniqueEmail,
} from "./helpers";

describe("booking persistence (DB integration)", () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("prevents overlapping bookings on the same court/time but allows another court", async () => {
    await getSeededPadelRentalService();
    const [courtA, courtB] = await getSeededPadelCourts(2);
    const date = nextWeekdayIsoDate(14);

    const first = await createBookingInDb({
      serviceCode: "padel-rental",
      date,
      startTime: "09:00",
      durationMin: 60,
      courtId: courtA.id,
      customer: {
        name: "Integration User 1",
        email: uniqueEmail("it-court-1"),
        phone: "+77070001001",
      },
    });

    expect(first.booking.status).toBe("confirmed");
    expect(first.booking.priceTotal).toBeGreaterThan(0);
    expect(first.booking.resources.some((r) => r.resourceType === "court" && r.resourceId === courtA.id)).toBe(true);

    await expect(
      createBookingInDb({
        serviceCode: "padel-rental",
        date,
        startTime: "09:00",
        durationMin: 60,
        courtId: courtA.id,
        customer: {
          name: "Integration User 2",
          email: uniqueEmail("it-court-2"),
          phone: "+77070001002",
        },
      }),
    ).rejects.toThrow("Слот уже занят");

    const otherCourt = await createBookingInDb({
      serviceCode: "padel-rental",
      date,
      startTime: "09:00",
      durationMin: 60,
      courtId: courtB.id,
      customer: {
        name: "Integration User 3",
        email: uniqueEmail("it-court-3"),
        phone: "+77070001003",
      },
    });

    expect(
      otherCourt.booking.resources.some((r) => r.resourceType === "court" && r.resourceId === courtB.id),
    ).toBe(true);
  });

  it("applies trainer-specific pricing for training bookings", async () => {
    await getSeededPadelTrainingService();
    const [courtA, courtB] = await getSeededPadelCourts(2);
    const [trainerA, trainerB] = await getSeededPadelInstructors(2);
    const date = nextWeekdayIsoDate(16);

    const morningA = await createBookingInDb({
      serviceCode: "padel-coaching",
      date,
      startTime: "09:00",
      durationMin: 60,
      courtId: courtA.id,
      instructorId: trainerA.id,
      customer: {
        name: "Training User A",
        email: uniqueEmail("it-training-a"),
        phone: "+77070002001",
      },
    });

    const morningB = await createBookingInDb({
      serviceCode: "padel-coaching",
      date,
      startTime: "10:00",
      durationMin: 60,
      courtId: courtB.id,
      instructorId: trainerB.id,
      customer: {
        name: "Training User B",
        email: uniqueEmail("it-training-b"),
        phone: "+77070002002",
      },
    });

    expect(morningA.booking.priceTotal).not.toBe(morningB.booking.priceTotal);

    const priceA = Number(trainerA.pricePerHour);
    const priceB = Number(trainerB.pricePerHour);
    const totalDiff = Math.abs(morningA.booking.priceTotal - morningB.booking.priceTotal);
    expect(totalDiff).toBe(Math.abs(priceA - priceB));
  });

  it("serializes conflicting concurrent requests so only one booking succeeds", async () => {
    const [courtA] = await getSeededPadelCourts(1);
    const date = nextWeekdayIsoDate(18);

    const attempts = await Promise.allSettled([
      createBookingInDb({
        serviceCode: "padel-rental",
        date,
        startTime: "11:00",
        durationMin: 60,
        courtId: courtA.id,
        customer: {
          name: "Concurrent User A",
          email: uniqueEmail("it-concurrent-a"),
          phone: "+77070003001",
        },
      }),
      createBookingInDb({
        serviceCode: "padel-rental",
        date,
        startTime: "11:00",
        durationMin: 60,
        courtId: courtA.id,
        customer: {
          name: "Concurrent User B",
          email: uniqueEmail("it-concurrent-b"),
          phone: "+77070003002",
        },
      }),
    ]);

    const fulfilled = attempts.filter((item) => item.status === "fulfilled");
    const rejected = attempts.filter((item) => item.status === "rejected");

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(String((rejected[0] as PromiseRejectedResult).reason)).toContain("Слот уже занят");
  });
});
