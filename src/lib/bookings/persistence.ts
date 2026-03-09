import type { Prisma } from "@prisma/client";
import { withBookingConcurrencyGuard } from "@/src/lib/bookings/concurrency";
import {
  buildActiveBookingHoldOverlapWhere,
  createBookingHold,
  expireStaleBookingHolds,
  getActiveBookingHoldById,
  markBookingHoldStatus,
} from "@/src/lib/bookings/holds";
import type { ComponentPriceRecord, ServiceRecord } from "@/src/lib/domain/types";
import { evaluatePricing } from "@/src/lib/pricing/engine";
import { notifyBookingCreated } from "@/src/lib/notifications/bookings";
import { prisma } from "@/src/lib/prisma";
import { formatTimeInVenueTimezone, toVenueIsoDate, venueDateTimeToUtc } from "@/src/lib/time/venue-timezone";
import { debitUserWallet } from "@/src/lib/wallet/service";

interface CreateBookingPersistentInput {
  serviceCode: string;
  locationId: string;
  date: string;
  startTime: string;
  durationMin: number;
  courtId?: string;
  instructorId?: string;
  customerUserId?: string;
  holdId?: string;
  paymentMode?: BookingPaymentMode;
  allowCurrentHourLateBooking?: boolean;
  customer: {
    name: string;
    email: string;
    phone: string;
  };
}

export type BookingPaymentMode = "wallet" | "cash" | "auto";
type BookingSettlementMode = "wallet_paid" | "cash_paid" | "manual_unpaid";

interface CreateBookingHoldSlotInput {
  startTime: string;
  courtId: string;
  holdId?: string;
}

interface CreateBookingHoldsPersistentInput {
  serviceCode: string;
  locationId: string;
  date: string;
  durationMin: number;
  instructorId?: string;
  customerUserId?: string;
  customer: {
    name: string;
    email: string;
    phone: string;
  };
  slots: CreateBookingHoldSlotInput[];
}

export interface CreateBookingInDbSuccessResult {
  booking: {
    id: string;
    customerId: string;
    serviceId: string;
    serviceDbId: string;
    startAtUtc: string;
    endAtUtc: string;
    durationMin: number;
    status: string;
    currency: string;
    priceTotal: number;
    pricingBreakdownJson: unknown;
    resources: Array<{ resourceType: "court" | "instructor"; resourceId: string }>;
  };
  payment: {
    id: string;
    provider: string;
    status: string;
    amount: number;
    currency: string;
    providerPaymentId: string | null;
    message: string;
  };
}

export interface CreateBookingHoldsInDbResult {
  holds: Array<{
    holdId: string;
    startTime: string;
    endTime: string;
    courtId: string;
    instructorId?: string;
    amountRequiredKzt: number;
    expiresAtIso: string;
  }>;
  totalAmountRequiredKzt: number;
  currency: string;
}

export class InsufficientWalletBalanceError extends Error {
  readonly code = "INSUFFICIENT_WALLET_BALANCE" as const;
  readonly holdId: string;
  readonly currentBalanceKzt: number;
  readonly amountRequiredKzt: number;
  readonly shortfallKzt: number;
  readonly expiresAtIso: string;

  constructor(args: {
    holdId: string;
    currentBalanceKzt: number;
    amountRequiredKzt: number;
    shortfallKzt: number;
    expiresAt: Date;
  }) {
    super("Недостаточно средств на балансе");
    this.name = "InsufficientWalletBalanceError";
    this.holdId = args.holdId;
    this.currentBalanceKzt = args.currentBalanceKzt;
    this.amountRequiredKzt = args.amountRequiredKzt;
    this.shortfallKzt = args.shortfallKzt;
    this.expiresAtIso = args.expiresAt.toISOString();
  }
}

interface InsufficientWalletResult {
  insufficientWallet: {
    holdId: string;
    currentBalanceKzt: number;
    amountRequiredKzt: number;
    shortfallKzt: number;
    expiresAt: Date;
  };
}

function isSameVenueHourAsNow(date: string, startTime: string, now: Date): boolean {
  if (date !== toVenueIsoDate(now)) {
    return false;
  }

  const bookingHour = Number(startTime.split(":")[0] ?? "-1");
  if (!Number.isFinite(bookingHour) || bookingHour < 0 || bookingHour > 23) {
    return false;
  }

  const nowHour = Number(formatTimeInVenueTimezone(now).split(":")[0] ?? "-1");
  return bookingHour === nowHour;
}

function ensureMatchingHold(args: {
  hold: {
    serviceId: string;
    locationId: string;
    courtId: string | null;
    instructorId: string | null;
    startAt: Date;
    endAt: Date;
  };
  serviceId: string;
  locationId: string;
  courtId?: string;
  instructorId?: string;
  startAt: Date;
  endAt: Date;
}) {
  const sameWindow =
    args.hold.startAt.getTime() === args.startAt.getTime() && args.hold.endAt.getTime() === args.endAt.getTime();

  if (
    args.hold.serviceId !== args.serviceId ||
    args.hold.locationId !== args.locationId ||
    (args.hold.courtId ?? undefined) !== args.courtId ||
    (args.hold.instructorId ?? undefined) !== args.instructorId ||
    !sameWindow
  ) {
    throw new Error("Сохраненный hold не соответствует текущему бронированию");
  }
}

export async function createBookingInDb(
  input: CreateBookingPersistentInput,
): Promise<CreateBookingInDbSuccessResult> {
  if (input.durationMin !== 60) {
    throw new Error("Поддерживается только сессия 60 минут");
  }
  if (!/^\d{2}:00$/.test(input.startTime)) {
    throw new Error("Поддерживаются только часовые слоты (например, 09:00)");
  }

  const requestedPaymentMode: BookingPaymentMode =
    input.paymentMode === "cash" || input.paymentMode === "auto" ? input.paymentMode : "wallet";

  const service = await prisma.service.findUnique({
    where: { code: input.serviceCode },
    include: {
      sport: {
        select: {
          slug: true,
          name: true,
        },
      },
    },
  });

  if (!service || !service.active) {
    throw new Error("Услуга не найдена");
  }
  if (service.locationId && service.locationId !== input.locationId) {
    throw new Error("Услуга недоступна для выбранной локации");
  }

  if (service.requiresCourt && !input.courtId) {
    throw new Error("Для выбранной услуги требуется courtId");
  }
  if (service.requiresInstructor && !input.instructorId) {
    throw new Error("Для выбранной услуги требуется instructorId");
  }

  const selectedCourt = input.courtId
    ? await prisma.court.findUnique({
        where: { id: input.courtId },
        select: {
          id: true,
          active: true,
          sportId: true,
          locationId: true,
        },
      })
    : null;

  if (service.requiresCourt) {
    if (!selectedCourt || !selectedCourt.active) {
      throw new Error("Корт не найден");
    }
    if (selectedCourt.sportId !== service.sportId) {
      throw new Error("Корт не подходит для выбранной услуги");
    }
    if (selectedCourt.locationId !== input.locationId) {
      throw new Error("Корт не принадлежит выбранной локации");
    }
  }

  const instructorForPricing =
    service.requiresInstructor && input.instructorId
      ? await prisma.instructor.findUnique({
          where: { id: input.instructorId },
          select: {
            id: true,
            active: true,
            instructorSports: {
              where: { sportId: service.sportId },
              select: {
                pricePerHour: true,
              },
            },
            instructorLocations: {
              where: { locationId: input.locationId, active: true },
              select: {
                id: true,
              },
            },
          },
        })
      : null;

  if (service.requiresInstructor) {
    if (!instructorForPricing || !instructorForPricing.active) {
      throw new Error("Тренер не найден");
    }
    if (instructorForPricing.instructorSports.length === 0) {
      throw new Error("Тренер не подходит для выбранного спорта");
    }
    if (instructorForPricing.instructorLocations.length === 0) {
      throw new Error("Тренер не доступен в выбранной локации");
    }
  }

  const startAt = venueDateTimeToUtc(input.date, input.startTime);
  const endAt = new Date(startAt.getTime() + 60 * 60 * 1000);
  const now = new Date();
  const allowLateCurrentHourBooking =
    input.allowCurrentHourLateBooking === true && isSameVenueHourAsNow(input.date, input.startTime, now);

  if (startAt <= now && !allowLateCurrentHourBooking) {
    throw new Error("Нельзя создать бронирование на прошедшее время");
  }

  const resourceLocks = [
    ...(input.courtId ? [{ resourceType: "court" as const, resourceId: input.courtId }] : []),
    ...(input.instructorId
      ? [{ resourceType: "instructor" as const, resourceId: input.instructorId }]
      : []),
  ];

  const result = await withBookingConcurrencyGuard({
    prisma,
    resourceLocks,
    run: async (txUnknown) => {
      const tx = txUnknown as typeof prisma;
      await expireStaleBookingHolds(tx);

      const conflict = await tx.booking.findFirst({
        where: {
          status: { in: ["pending_payment", "confirmed"] },
          startAt: { lt: endAt },
          endAt: { gt: startAt },
          resources: {
            some: {
              OR: [
                ...(input.courtId
                  ? [{ resourceType: "court" as const, resourceId: input.courtId }]
                  : []),
                ...(input.instructorId
                  ? [{ resourceType: "instructor" as const, resourceId: input.instructorId }]
                  : []),
              ],
            },
          },
        },
        select: { id: true },
      });

      if (conflict) {
        throw new Error("Слот уже занят");
      }

      const holdConflict = await tx.bookingHold.findFirst({
        where: buildActiveBookingHoldOverlapWhere({
          locationId: input.locationId,
          startAt,
          endAt,
          courtId: input.courtId,
          instructorId: input.instructorId,
          excludeHoldId: input.holdId,
        }),
        select: { id: true },
      });

      if (holdConflict) {
        throw new Error("Слот уже занят");
      }

      const customerUser = input.customerUserId
        ? await tx.user.findUnique({
            where: { id: input.customerUserId },
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              walletBalance: true,
            },
          })
        : (await tx.user.findUnique({
            where: { email: input.customer.email },
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              walletBalance: true,
            },
          })) ??
          (await tx.user.create({
            data: {
              name: input.customer.name,
              email: input.customer.email,
              phone: input.customer.phone,
              passwordHash: "guest-booking-placeholder",
              role: "customer",
            },
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              walletBalance: true,
            },
          }));

      if (!customerUser) {
        throw new Error("Пользователь аккаунта не найден");
      }

      const dbComponentPrices = await tx.componentPrice.findMany({
        where: {
          locationId: input.locationId,
          sportId: service.sportId,
          currency: "KZT",
          componentType: {
            in: ["court", "instructor"],
          },
        },
        include: {
          sport: {
            select: {
              slug: true,
            },
          },
        },
      });

      const componentPrices: ComponentPriceRecord[] = dbComponentPrices.map((item) => ({
        id: item.id,
        sport: item.sport.slug,
        componentType: item.componentType,
        tier: item.period,
        currency: item.currency,
        amount: Number(item.amount),
      }));

      const serviceRecord: ServiceRecord = {
        id: service.code,
        name: service.name,
        sport: service.sport.slug,
        requiresCourt: service.requiresCourt,
        requiresInstructor: service.requiresInstructor,
        active: service.active,
      };

      const instructorPriceOverrideAmount =
        service.requiresInstructor && instructorForPricing
          ? Number(instructorForPricing.instructorSports[0]?.pricePerHour ?? 0)
          : undefined;

      const pricing = evaluatePricing({
        service: serviceRecord,
        bookingDate: input.date,
        bookingStartTime: input.startTime,
        durationMin: input.durationMin,
        componentPrices,
        instructorPriceOverrideAmount,
        currency: "KZT",
      });
      const pricingBreakdownJson = JSON.parse(JSON.stringify(pricing.breakdown)) as Prisma.InputJsonValue;

      const activeHold = input.holdId
        ? await getActiveBookingHoldById({
            holdId: input.holdId,
            customerId: customerUser.id,
            tx,
          })
        : null;

      if (activeHold) {
        ensureMatchingHold({
          hold: activeHold,
          serviceId: service.id,
          locationId: input.locationId,
          courtId: input.courtId,
          instructorId: input.instructorId,
          startAt,
          endAt,
        });
      }

      const currentBalanceKzt = Number(customerUser.walletBalance);
      const effectiveSettlementMode: BookingSettlementMode =
        requestedPaymentMode === "cash"
          ? "cash_paid"
          : requestedPaymentMode === "auto"
            ? currentBalanceKzt >= pricing.total
              ? "wallet_paid"
              : "manual_unpaid"
            : "wallet_paid";

      if (requestedPaymentMode === "wallet" && currentBalanceKzt < pricing.total) {
        const hold =
          activeHold ??
          (await createBookingHold(
            {
              customerId: customerUser.id,
              serviceId: service.id,
              locationId: input.locationId,
              startAt,
              endAt,
              amountRequiredKzt: pricing.total,
              pricingBreakdownJson,
              courtId: input.courtId,
              instructorId: input.instructorId,
            },
            tx,
          ));

        return {
          insufficientWallet: {
            holdId: hold.id,
            currentBalanceKzt,
            amountRequiredKzt: pricing.total,
            shortfallKzt: pricing.total - currentBalanceKzt,
            expiresAt: hold.expiresAt,
          },
        } satisfies InsufficientWalletResult;
      }

      const booking = await tx.booking.create({
        data: {
          customerId: customerUser.id,
          serviceId: service.id,
          locationId: input.locationId,
          startAt,
          endAt,
          status: effectiveSettlementMode === "manual_unpaid" ? "pending_payment" : "confirmed",
          currency: pricing.currency,
          priceTotal: pricing.total,
          pricingBreakdownJson,
          resources: {
            create: [
              ...(input.courtId
                ? [{ resourceType: "court" as const, resourceId: input.courtId }]
                : []),
              ...(input.instructorId
                ? [{ resourceType: "instructor" as const, resourceId: input.instructorId }]
                : []),
            ],
          },
          payment: {
            create: {
              provider: effectiveSettlementMode === "wallet_paid" ? "wallet" : "manual",
              status: effectiveSettlementMode === "manual_unpaid" ? "unpaid" : "paid",
              amount: pricing.total,
              currency: pricing.currency,
              providerPaymentId: null,
            },
          },
        },
        include: {
          resources: true,
          payment: true,
          service: true,
        },
      });

      if (effectiveSettlementMode === "wallet_paid") {
        await debitUserWallet({
          tx,
          userId: customerUser.id,
          amountKzt: pricing.total,
          type: "booking_charge",
          bookingId: booking.id,
          holdId: activeHold?.id,
          note: "Оплата бронирования с баланса",
          metadataJson: {
            serviceCode: service.code,
            startAt: booking.startAt.toISOString(),
          },
        });
      }

      if (activeHold) {
        await markBookingHoldStatus({
          tx,
          holdId: activeHold.id,
          status: "converted",
          convertedBookingId: booking.id,
        });
      }

      return {
        booking: {
          id: booking.id,
          customerId: booking.customerId,
          serviceId: booking.service.code,
          serviceDbId: booking.serviceId,
          startAtUtc: booking.startAt.toISOString(),
          endAtUtc: booking.endAt.toISOString(),
          durationMin: 60,
          status: booking.status,
          currency: booking.currency,
          priceTotal: Number(booking.priceTotal),
          pricingBreakdownJson: booking.pricingBreakdownJson,
          resources: booking.resources.map((resource: { resourceType: "court" | "instructor"; resourceId: string }) => ({
            resourceType: resource.resourceType,
            resourceId: resource.resourceId,
          })),
        },
        payment: {
          id: booking.payment!.id,
          provider: booking.payment!.provider,
          status: booking.payment!.status,
          amount: Number(booking.payment!.amount),
          currency: booking.payment!.currency,
          providerPaymentId: booking.payment!.providerPaymentId,
          message:
            effectiveSettlementMode === "wallet_paid"
              ? "Оплачено с внутреннего баланса"
              : effectiveSettlementMode === "cash_paid"
                ? "Оплачено в клубе (наличные или карта)"
                : "Ожидает оплаты",
        },
      };
    },
  });

  const insufficientWallet = "insufficientWallet" in result ? result.insufficientWallet : undefined;
  if (insufficientWallet) {
    throw new InsufficientWalletBalanceError(insufficientWallet);
  }

  const success = result as CreateBookingInDbSuccessResult;
  await notifyBookingCreated({ bookingId: success.booking.id });
  return success;
}

export async function createBookingHoldsInDb(
  input: CreateBookingHoldsPersistentInput,
): Promise<CreateBookingHoldsInDbResult> {
  if (input.durationMin !== 60) {
    throw new Error("Поддерживается только сессия 60 минут");
  }
  if (input.slots.length === 0) {
    throw new Error("Не выбраны слоты для hold");
  }

  const seenSlotKeys = new Set<string>();
  for (const slot of input.slots) {
    if (!/^\d{2}:00$/.test(slot.startTime)) {
      throw new Error("Поддерживаются только часовые слоты (например, 09:00)");
    }
    const slotKey = `${slot.startTime}:${slot.courtId}`;
    if (seenSlotKeys.has(slotKey)) {
      throw new Error("Слот не может повторяться в одном hold-запросе");
    }
    seenSlotKeys.add(slotKey);
  }

  const service = await prisma.service.findUnique({
    where: { code: input.serviceCode },
    include: {
      sport: {
        select: {
          slug: true,
          name: true,
        },
      },
    },
  });

  if (!service || !service.active) {
    throw new Error("Услуга не найдена");
  }
  if (service.locationId && service.locationId !== input.locationId) {
    throw new Error("Услуга недоступна для выбранной локации");
  }
  if (service.requiresInstructor && !input.instructorId) {
    throw new Error("Для выбранной услуги требуется instructorId");
  }

  const uniqueCourtIds = Array.from(new Set(input.slots.map((slot) => slot.courtId)));
  const selectedCourts = await prisma.court.findMany({
    where: {
      id: { in: uniqueCourtIds },
    },
    select: {
      id: true,
      active: true,
      sportId: true,
      locationId: true,
    },
  });
  const courtsById = new Map(selectedCourts.map((court) => [court.id, court]));

  for (const courtId of uniqueCourtIds) {
    const selectedCourt = courtsById.get(courtId);
    if (!selectedCourt || !selectedCourt.active) {
      throw new Error("Корт не найден");
    }
    if (selectedCourt.sportId !== service.sportId) {
      throw new Error("Корт не подходит для выбранной услуги");
    }
    if (selectedCourt.locationId !== input.locationId) {
      throw new Error("Корт не принадлежит выбранной локации");
    }
  }

  const instructorForPricing =
    service.requiresInstructor && input.instructorId
      ? await prisma.instructor.findUnique({
          where: { id: input.instructorId },
          select: {
            id: true,
            active: true,
            instructorSports: {
              where: { sportId: service.sportId },
              select: {
                pricePerHour: true,
              },
            },
            instructorLocations: {
              where: { locationId: input.locationId, active: true },
              select: {
                id: true,
              },
            },
          },
        })
      : null;

  if (service.requiresInstructor) {
    if (!instructorForPricing || !instructorForPricing.active) {
      throw new Error("Тренер не найден");
    }
    if (instructorForPricing.instructorSports.length === 0) {
      throw new Error("Тренер не подходит для выбранного спорта");
    }
    if (instructorForPricing.instructorLocations.length === 0) {
      throw new Error("Тренер не доступен в выбранной локации");
    }
  }

  const resourceLocks = [
    ...uniqueCourtIds.map((courtId) => ({ resourceType: "court" as const, resourceId: courtId })),
    ...(input.instructorId
      ? [{ resourceType: "instructor" as const, resourceId: input.instructorId }]
      : []),
  ];

  return withBookingConcurrencyGuard({
    prisma,
    resourceLocks,
    run: async (txUnknown) => {
      const tx = txUnknown as typeof prisma;
      await expireStaleBookingHolds(tx);

      const customerUser = input.customerUserId
        ? await tx.user.findUnique({
            where: { id: input.customerUserId },
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          })
        : (await tx.user.findUnique({
            where: { email: input.customer.email },
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          })) ??
          (await tx.user.create({
            data: {
              name: input.customer.name,
              email: input.customer.email,
              phone: input.customer.phone,
              passwordHash: "guest-booking-placeholder",
              role: "customer",
            },
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          }));

      if (!customerUser) {
        throw new Error("Пользователь аккаунта не найден");
      }

      const dbComponentPrices = await tx.componentPrice.findMany({
        where: {
          locationId: input.locationId,
          sportId: service.sportId,
          currency: "KZT",
          componentType: {
            in: ["court", "instructor"],
          },
        },
        include: {
          sport: {
            select: {
              slug: true,
            },
          },
        },
      });

      const componentPrices: ComponentPriceRecord[] = dbComponentPrices.map((item) => ({
        id: item.id,
        sport: item.sport.slug,
        componentType: item.componentType,
        tier: item.period,
        currency: item.currency,
        amount: Number(item.amount),
      }));

      const serviceRecord: ServiceRecord = {
        id: service.code,
        name: service.name,
        sport: service.sport.slug,
        requiresCourt: service.requiresCourt,
        requiresInstructor: service.requiresInstructor,
        active: service.active,
      };

      const instructorPriceOverrideAmount =
        service.requiresInstructor && instructorForPricing
          ? Number(instructorForPricing.instructorSports[0]?.pricePerHour ?? 0)
          : undefined;

      const holds = [];
      for (const slot of input.slots) {
        const startAt = venueDateTimeToUtc(input.date, slot.startTime);
        const endAt = new Date(startAt.getTime() + 60 * 60 * 1000);

        const conflict = await tx.booking.findFirst({
          where: {
            status: { in: ["pending_payment", "confirmed"] },
            startAt: { lt: endAt },
            endAt: { gt: startAt },
            resources: {
              some: {
                OR: [
                  { resourceType: "court", resourceId: slot.courtId },
                  ...(input.instructorId
                    ? [{ resourceType: "instructor" as const, resourceId: input.instructorId }]
                    : []),
                ],
              },
            },
          },
          select: { id: true },
        });

        if (conflict) {
          throw new Error("Слот уже занят");
        }

        const holdConflict = await tx.bookingHold.findFirst({
          where: buildActiveBookingHoldOverlapWhere({
            locationId: input.locationId,
            startAt,
            endAt,
            courtId: slot.courtId,
            instructorId: input.instructorId,
            excludeHoldId: slot.holdId,
          }),
          select: { id: true },
        });

        if (holdConflict) {
          throw new Error("Слот уже занят");
        }

        const pricing = evaluatePricing({
          service: serviceRecord,
          bookingDate: input.date,
          bookingStartTime: slot.startTime,
          durationMin: input.durationMin,
          componentPrices,
          instructorPriceOverrideAmount,
          currency: "KZT",
        });
        const pricingBreakdownJson = JSON.parse(JSON.stringify(pricing.breakdown)) as Prisma.InputJsonValue;

        const activeHold = slot.holdId
          ? await getActiveBookingHoldById({
              holdId: slot.holdId,
              customerId: customerUser.id,
              tx,
            })
          : null;

        if (activeHold) {
          ensureMatchingHold({
            hold: activeHold,
            serviceId: service.id,
            locationId: input.locationId,
            courtId: slot.courtId,
            instructorId: input.instructorId,
            startAt,
            endAt,
          });
        }

        const hold =
          activeHold ??
          (await createBookingHold(
            {
              customerId: customerUser.id,
              serviceId: service.id,
              locationId: input.locationId,
              startAt,
              endAt,
              amountRequiredKzt: pricing.total,
              pricingBreakdownJson,
              courtId: slot.courtId,
              instructorId: input.instructorId,
            },
            tx,
          ));

        holds.push({
          holdId: hold.id,
          startTime: slot.startTime,
          endTime: new Date(endAt).toISOString(),
          courtId: slot.courtId,
          instructorId: input.instructorId,
          amountRequiredKzt: Number(hold.amountRequired),
          expiresAtIso: hold.expiresAt.toISOString(),
        });
      }

      return {
        holds,
        totalAmountRequiredKzt: holds.reduce((sum, hold) => sum + hold.amountRequiredKzt, 0),
        currency: "KZT",
      };
    },
  });
}
