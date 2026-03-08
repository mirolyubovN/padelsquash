import { afterAll, describe, expect, it } from "vitest";
import {
  createBookingHoldsInDb,
  createBookingInDb,
  InsufficientWalletBalanceError,
} from "@/src/lib/bookings/persistence";
import { prisma } from "@/src/lib/prisma";
import { getUserWalletBalance } from "@/src/lib/wallet/service";
import {
  createCustomerWithWallet,
  getSeededPadelCourts,
  getSeededPadelInstructors,
  getSeededPadelRentalService,
  getSeededPadelTrainingService,
  nextWeekdayIsoDate,
} from "./helpers";
import { formatTimeInVenueTimezone, toVenueIsoDate } from "@/src/lib/time/venue-timezone";

describe("booking persistence (DB integration)", () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("prevents overlapping bookings on the same court/time but allows another court", async () => {
    await getSeededPadelRentalService();
    const [courtA, courtB] = await getSeededPadelCourts(2);
    const date = nextWeekdayIsoDate(14);
    const userA = await createCustomerWithWallet("it-court-1");
    const userB = await createCustomerWithWallet("it-court-2");
    const userC = await createCustomerWithWallet("it-court-3");

    const first = await createBookingInDb({
      serviceCode: "padel-rental",
      locationId: courtA.locationId,
      date,
      startTime: "09:00",
      durationMin: 60,
      courtId: courtA.id,
      customerUserId: userA.id,
      customer: {
        name: userA.name,
        email: userA.email,
        phone: userA.phone,
      },
    });

    expect(first.booking.status).toBe("confirmed");
    expect(first.booking.priceTotal).toBeGreaterThan(0);
    expect(first.payment.provider).toBe("wallet");
    expect(first.booking.resources.some((r) => r.resourceType === "court" && r.resourceId === courtA.id)).toBe(true);

    await expect(
      createBookingInDb({
        serviceCode: "padel-rental",
        locationId: courtA.locationId,
        date,
        startTime: "09:00",
        durationMin: 60,
        courtId: courtA.id,
        customerUserId: userB.id,
        customer: {
          name: userB.name,
          email: userB.email,
          phone: userB.phone,
        },
      }),
    ).rejects.toThrow("Слот уже занят");

    const otherCourt = await createBookingInDb({
      serviceCode: "padel-rental",
      locationId: courtB.locationId,
      date,
      startTime: "09:00",
      durationMin: 60,
      courtId: courtB.id,
      customerUserId: userC.id,
      customer: {
        name: userC.name,
        email: userC.email,
        phone: userC.phone,
      },
    });

    expect(otherCourt.booking.resources.some((r) => r.resourceType === "court" && r.resourceId === courtB.id)).toBe(true);
  });

  it("applies trainer-specific pricing for training bookings", async () => {
    await getSeededPadelTrainingService();
    const [courtA, courtB] = await getSeededPadelCourts(2);
    const [trainerA, trainerB] = await getSeededPadelInstructors(2);
    const date = nextWeekdayIsoDate(46);
    const userA = await createCustomerWithWallet("it-training-a");
    const userB = await createCustomerWithWallet("it-training-b");

    const morningA = await createBookingInDb({
      serviceCode: "padel-coaching",
      locationId: courtA.locationId,
      date,
      startTime: "09:00",
      durationMin: 60,
      courtId: courtA.id,
      instructorId: trainerA.id,
      customerUserId: userA.id,
      customer: {
        name: userA.name,
        email: userA.email,
        phone: userA.phone,
      },
    });

    const morningB = await createBookingInDb({
      serviceCode: "padel-coaching",
      locationId: courtB.locationId,
      date,
      startTime: "10:00",
      durationMin: 60,
      courtId: courtB.id,
      instructorId: trainerB.id,
      customerUserId: userB.id,
      customer: {
        name: userB.name,
        email: userB.email,
        phone: userB.phone,
      },
    });

    expect(morningA.booking.priceTotal).not.toBe(morningB.booking.priceTotal);

    const priceA = Number(trainerA.pricePerHour);
    const priceB = Number(trainerB.pricePerHour);
    const totalDiff = Math.abs(morningA.booking.priceTotal - morningB.booking.priceTotal);
    expect(totalDiff).toBe(Math.abs(priceA - priceB));
  });

  it("creates a temporary hold when the wallet balance is insufficient", async () => {
    const [courtA] = await getSeededPadelCourts(1);
    const date = nextWeekdayIsoDate(50);
    const user = await createCustomerWithWallet("it-hold", 5_000);

    await expect(
      createBookingInDb({
        serviceCode: "padel-rental",
        locationId: courtA.locationId,
        date,
        startTime: "12:00",
        durationMin: 60,
        courtId: courtA.id,
        customerUserId: user.id,
        customer: {
          name: user.name,
          email: user.email,
          phone: user.phone,
        },
      }),
    ).rejects.toBeInstanceOf(InsufficientWalletBalanceError);

    const hold = await prisma.bookingHold.findFirst({
      where: {
        customerId: user.id,
        status: "active",
      },
      orderBy: { createdAt: "desc" },
    });

    expect(hold).not.toBeNull();
    expect(Number(hold?.amountRequired ?? 0)).toBeGreaterThan(5_000);
  });

  it("creates a confirmed booking with cash mode when wallet balance is insufficient", async () => {
    await getSeededPadelRentalService();
    const [courtA] = await getSeededPadelCourts(1);
    const date = nextWeekdayIsoDate(51);
    const user = await createCustomerWithWallet("it-cash-mode", 1_000);
    const balanceBefore = await getUserWalletBalance(user.id);

    const created = await createBookingInDb({
      serviceCode: "padel-rental",
      locationId: courtA.locationId,
      date,
      startTime: "14:00",
      durationMin: 60,
      courtId: courtA.id,
      paymentMode: "cash",
      customerUserId: user.id,
      customer: {
        name: user.name,
        email: user.email,
        phone: user.phone,
      },
    });

    const balanceAfter = await getUserWalletBalance(user.id);
    const activeHold = await prisma.bookingHold.findFirst({
      where: { customerId: user.id, status: "active" },
    });

    expect(created.booking.status).toBe("confirmed");
    expect(created.payment.provider).toBe("manual");
    expect(created.payment.message).toContain("налич");
    expect(balanceAfter).toBe(balanceBefore);
    expect(activeHold).toBeNull();
  });

  it("falls back to cash in auto payment mode when wallet balance is insufficient", async () => {
    await getSeededPadelRentalService();
    const [courtA] = await getSeededPadelCourts(1);
    const date = nextWeekdayIsoDate(52);
    const user = await createCustomerWithWallet("it-auto-cash", 1_000);
    const balanceBefore = await getUserWalletBalance(user.id);

    const created = await createBookingInDb({
      serviceCode: "padel-rental",
      locationId: courtA.locationId,
      date,
      startTime: "15:00",
      durationMin: 60,
      courtId: courtA.id,
      paymentMode: "auto",
      customerUserId: user.id,
      customer: {
        name: user.name,
        email: user.email,
        phone: user.phone,
      },
    });

    const balanceAfter = await getUserWalletBalance(user.id);
    const activeHold = await prisma.bookingHold.findFirst({
      where: { customerId: user.id, status: "active" },
    });

    expect(created.booking.status).toBe("confirmed");
    expect(created.payment.provider).toBe("manual");
    expect(created.payment.message).toContain("налич");
    expect(balanceAfter).toBe(balanceBefore);
    expect(activeHold).toBeNull();
  });

  it("rejects bookings in the past even when a direct request is made", async () => {
    const [courtA] = await getSeededPadelCourts(1);
    const user = await createCustomerWithWallet("it-past-booking");
    const now = new Date();
    const currentHour = Number(formatTimeInVenueTimezone(now).split(":")[0] ?? "0");
    const date = currentHour > 0 ? toVenueIsoDate(now) : toVenueIsoDate(new Date(Date.now() - 24 * 60 * 60 * 1000));
    const startTime = `${String(currentHour > 0 ? currentHour - 1 : 23).padStart(2, "0")}:00`;

    await expect(
      createBookingInDb({
        serviceCode: "padel-rental",
        locationId: courtA.locationId,
        date,
        startTime,
        durationMin: 60,
        courtId: courtA.id,
        customerUserId: user.id,
        customer: {
          name: user.name,
          email: user.email,
          phone: user.phone,
        },
      }),
    ).rejects.toThrow("Нельзя создать бронирование на прошедшее время");
  });

  it("converts an active hold into a confirmed booking after top-up", async () => {
    const [courtA] = await getSeededPadelCourts(1);
    const date = nextWeekdayIsoDate(54);
    const user = await createCustomerWithWallet("it-resume", 5_000);

    let holdId = "";
    try {
      await createBookingInDb({
        serviceCode: "padel-rental",
        locationId: courtA.locationId,
        date,
        startTime: "13:00",
        durationMin: 60,
        courtId: courtA.id,
        customerUserId: user.id,
        customer: {
          name: user.name,
          email: user.email,
          phone: user.phone,
        },
      });
    } catch (error) {
      if (error instanceof InsufficientWalletBalanceError) {
        holdId = error.holdId;
      }
    }

    expect(holdId).not.toBe("");

    await prisma.user.update({
      where: { id: user.id },
      data: { walletBalance: 100_000 },
    });

    const resumed = await createBookingInDb({
      serviceCode: "padel-rental",
      locationId: courtA.locationId,
      date,
      startTime: "13:00",
      durationMin: 60,
      courtId: courtA.id,
      holdId,
      customerUserId: user.id,
      customer: {
        name: user.name,
        email: user.email,
        phone: user.phone,
      },
    });

    const hold = await prisma.bookingHold.findUnique({ where: { id: holdId } });
    const balanceAfter = await getUserWalletBalance(user.id);

    expect(resumed.booking.status).toBe("confirmed");
    expect(hold?.status).toBe("converted");
    expect(balanceAfter).toBeLessThan(100_000);
  });

  it("creates grouped holds for multiple selected slots and blocks competing bookings", async () => {
    const [courtA, courtB] = await getSeededPadelCourts(2);
    const date = nextWeekdayIsoDate(58);
    const user = await createCustomerWithWallet("it-multi-hold", 5_000);
    const competitor = await createCustomerWithWallet("it-multi-hold-competitor");

    const holdResult = await createBookingHoldsInDb({
      serviceCode: "padel-rental",
      locationId: courtA.locationId,
      date,
      durationMin: 60,
      customerUserId: user.id,
      customer: {
        name: user.name,
        email: user.email,
        phone: user.phone,
      },
      slots: [
        { startTime: "15:00", courtId: courtA.id },
        { startTime: "16:00", courtId: courtB.id },
      ],
    });

    expect(holdResult.holds).toHaveLength(2);

    await expect(
      createBookingInDb({
        serviceCode: "padel-rental",
        locationId: courtA.locationId,
        date,
        startTime: "15:00",
        durationMin: 60,
        courtId: courtA.id,
        customerUserId: competitor.id,
        customer: {
          name: competitor.name,
          email: competitor.email,
          phone: competitor.phone,
        },
      }),
    ).rejects.toThrow("Слот уже занят");

    await prisma.user.update({
      where: { id: user.id },
      data: { walletBalance: 100_000 },
    });

    await createBookingInDb({
      serviceCode: "padel-rental",
      locationId: courtA.locationId,
      date,
      startTime: "15:00",
      durationMin: 60,
      courtId: courtA.id,
      holdId: holdResult.holds[0]?.holdId,
      customerUserId: user.id,
      customer: {
        name: user.name,
        email: user.email,
        phone: user.phone,
      },
    });

    await createBookingInDb({
      serviceCode: "padel-rental",
      locationId: courtB.locationId,
      date,
      startTime: "16:00",
      durationMin: 60,
      courtId: courtB.id,
      holdId: holdResult.holds[1]?.holdId,
      customerUserId: user.id,
      customer: {
        name: user.name,
        email: user.email,
        phone: user.phone,
      },
    });

    const convertedHolds = await prisma.bookingHold.count({
      where: {
        id: { in: holdResult.holds.map((hold) => hold.holdId) },
        status: "converted",
      },
    });

    expect(convertedHolds).toBe(2);
  });

  it("serializes conflicting concurrent requests so only one booking succeeds", async () => {
    const [courtA] = await getSeededPadelCourts(1);
    const date = nextWeekdayIsoDate(18);
    const userA = await createCustomerWithWallet("it-concurrent-a");
    const userB = await createCustomerWithWallet("it-concurrent-b");

    const attempts = await Promise.allSettled([
      createBookingInDb({
        serviceCode: "padel-rental",
        locationId: courtA.locationId,
        date,
        startTime: "11:00",
        durationMin: 60,
        courtId: courtA.id,
        customerUserId: userA.id,
        customer: {
          name: userA.name,
          email: userA.email,
          phone: userA.phone,
        },
      }),
      createBookingInDb({
        serviceCode: "padel-rental",
        locationId: courtA.locationId,
        date,
        startTime: "11:00",
        durationMin: 60,
        courtId: courtA.id,
        customerUserId: userB.id,
        customer: {
          name: userB.name,
          email: userB.email,
          phone: userB.phone,
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
