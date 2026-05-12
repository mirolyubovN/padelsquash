import { Prisma, type PromoCode as PrismaPromoCode } from "@prisma/client";
import {
  assertBookingSlotAvailable,
  assertBookingSlotConflictsClear,
} from "@/src/lib/bookings/availability-validator";
import { withBookingConcurrencyGuard } from "@/src/lib/bookings/concurrency";
import {
  createBookingHold,
  expireStaleBookingHolds,
  getActiveBookingHoldById,
  markBookingHoldStatus,
} from "@/src/lib/bookings/holds";
import type { ComponentPriceRecord, ServiceRecord } from "@/src/lib/domain/types";
import { evaluatePricing } from "@/src/lib/pricing/engine";
import { notifyBookingCreated } from "@/src/lib/notifications/bookings";
import { prisma } from "@/src/lib/prisma";
import {
  applyPromoToPricing,
  PromoIneligibleError,
  PROMO_ERROR_MESSAGES,
  type PromoApplyResult,
} from "@/src/lib/promo/apply";
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
  customerUserId: string;
  holdId?: string;
  paymentMode?: BookingPaymentMode;
  allowCurrentHourLateBooking?: boolean;
  promoCode?: string;
  customer?: {
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
  customerUserId: string;
  promoCode?: string;
  customer?: {
    name: string;
    email: string;
    phone: string;
  };
  slots: CreateBookingHoldSlotInput[];
}

interface CreateBookingSeriesPersistentInput {
  serviceCode: string;
  locationId: string;
  date: string;
  durationMin: number;
  instructorId?: string;
  customerUserId: string;
  promoCode?: string;
  customer?: {
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

export interface CreateBookingSeriesInDbResult {
  bookings: Array<{
    id: string;
    customerId: string;
    serviceId: string;
    serviceDbId: string;
    startAtUtc: string;
    endAtUtc: string;
    startTime: string;
    endTime: string;
    durationMin: number;
    status: string;
    currency: string;
    priceTotal: number;
    pricingBreakdownJson: unknown;
    resources: Array<{ resourceType: "court" | "instructor"; resourceId: string }>;
  }>;
  totalAmount: number;
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

export class SeriesInsufficientWalletBalanceError extends Error {
  readonly code = "INSUFFICIENT_WALLET_BALANCE_SERIES" as const;
  readonly currentBalanceKzt: number;
  readonly amountRequiredKzt: number;
  readonly shortfallKzt: number;

  constructor(args: {
    currentBalanceKzt: number;
    amountRequiredKzt: number;
    shortfallKzt: number;
  }) {
    super("Недостаточно средств на балансе для бронирования");
    this.name = "SeriesInsufficientWalletBalanceError";
    this.currentBalanceKzt = args.currentBalanceKzt;
    this.amountRequiredKzt = args.amountRequiredKzt;
    this.shortfallKzt = args.shortfallKzt;
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

async function resolveValidatedActiveHold(args: {
  holdId?: string;
  customerId: string;
  serviceId: string;
  locationId: string;
  courtId?: string;
  instructorId?: string;
  startAt: Date;
  endAt: Date;
  tx: typeof prisma;
}) {
  if (!args.holdId) {
    return null;
  }

  const activeHold = await getActiveBookingHoldById({
    holdId: args.holdId,
    customerId: args.customerId,
    tx: args.tx,
  });

  if (!activeHold) {
    throw new Error("Сохраненный hold не найден или недействителен");
  }

  ensureMatchingHold({
    hold: activeHold,
    serviceId: args.serviceId,
    locationId: args.locationId,
    courtId: args.courtId,
    instructorId: args.instructorId,
    startAt: args.startAt,
    endAt: args.endAt,
  });

  return activeHold;
}

// ---------------------------------------------------------------------------
// prepareBookingSlot — shared per-slot validation + pricing + promo
// ---------------------------------------------------------------------------
// Called inside a concurrency-guarded transaction by createBookingInDb,
// createBookingSeriesInDb, and createBookingHoldsInDb.  Does NOT write
// any rows — callers decide what to do with the result.
// ---------------------------------------------------------------------------

interface PrepareBookingSlotArgs {
  tx: typeof prisma;
  service: {
    id: string;
    code: string;
    sportId: string;
    requiresCourt: boolean;
    requiresInstructor: boolean;
    active: boolean;
    sport: { slug: string; name: string };
  };
  locationId: string;
  date: string;
  startTime: string;
  durationMin: number;
  courtId?: string;
  instructorId?: string;
  holdId?: string;
  customerId: string;
  startAt: Date;
  endAt: Date;
  componentPrices: ComponentPriceRecord[];
  serviceRecord: ServiceRecord;
  instructorPriceOverrideAmount: number | undefined;
  /** Pre-fetched promo record + counts — pass undefined when no promo. */
  promoContext?: {
    promo: PrismaPromoCode;
    existingCustomerRedemptions: number;
    existingTotalRedemptions: number;
    isFirstBooking: boolean;
  };
}

interface PrepareBookingSlotResult {
  startAt: Date;
  endAt: Date;
  activeHold: Awaited<ReturnType<typeof resolveValidatedActiveHold>>;
  pricing: ReturnType<typeof evaluatePricing>;
  effectiveTotal: number;
  /** Booking pricingBreakdownJson — plain array (existing booking shape). */
  pricingBreakdownJson: Prisma.InputJsonValue;
  /** Hold pricingBreakdownJson — always { items, promoCode? } object shape. */
  holdBreakdownJson: Prisma.InputJsonValue;
  promoResult: PromoApplyResult | undefined;
}

async function prepareBookingSlot(args: PrepareBookingSlotArgs): Promise<PrepareBookingSlotResult> {
  const { tx, service, locationId, date, startTime, durationMin, courtId, instructorId, holdId, customerId, startAt, endAt } = args;

  const activeHold = await resolveValidatedActiveHold({
    holdId,
    customerId,
    serviceId: service.id,
    locationId,
    courtId,
    instructorId,
    startAt,
    endAt,
    tx,
  });

  await assertBookingSlotAvailable({
    tx,
    service,
    locationId,
    date,
    startTime,
    durationMin,
    courtId,
    instructorId,
  });

  // Acquire advisory locks for any club events that overlap this slot and
  // share the court or instructor — consistent with how event mutations lock
  // via `pg_advisory_xact_lock(hashtext(eventId))` in src/lib/events/service.ts.
  // This prevents a concurrent event mutation from racing past the conflict check.
  if (courtId || instructorId) {
    const overlappingEvents = await tx.clubEvent.findMany({
      where: {
        status: { not: "cancelled" },
        startsAt: { lt: endAt },
        endsAt: { gt: startAt },
        OR: [
          ...(courtId ? [{ courts: { some: { courtId } } }] : []),
          ...(instructorId ? [{ instructorId }] : []),
        ],
      },
      select: { id: true },
    });
    const txRaw = tx as unknown as { $queryRaw: typeof prisma.$queryRaw };
    for (const event of overlappingEvents) {
      await txRaw.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${event.id}))`;
    }
  }

  await assertBookingSlotConflictsClear({
    tx,
    service,
    locationId,
    date,
    startTime,
    durationMin,
    courtId,
    instructorId,
    excludeHoldId: activeHold?.id,
    startAt,
    endAt,
  });

  const pricing = evaluatePricing({
    service: args.serviceRecord,
    bookingDate: date,
    bookingStartTime: startTime,
    durationMin,
    componentPrices: args.componentPrices,
    instructorPriceOverrideAmount: args.instructorPriceOverrideAmount,
    currency: "KZT",
  });

  let promoResult: PromoApplyResult | undefined;
  if (args.promoContext) {
    const { promo, existingCustomerRedemptions, existingTotalRedemptions, isFirstBooking } = args.promoContext;
    promoResult = applyPromoToPricing(pricing, promo, {
      customerId,
      serviceCode: service.code,
      sportId: service.sportId,
      existingCustomerRedemptions,
      existingTotalRedemptions,
      isFirstBooking,
      bookingDate: date,
    });
  }

  const effectiveTotal = promoResult?.totalAfterDiscount ?? pricing.total;

  // Booking pricingBreakdownJson keeps the existing array shape.
  const pricingBreakdownJson: Prisma.InputJsonValue = promoResult
    ? (JSON.parse(JSON.stringify([...pricing.breakdown, promoResult.promoLine])) as Prisma.InputJsonValue)
    : (JSON.parse(JSON.stringify(pricing.breakdown)) as Prisma.InputJsonValue);

  // Hold pricingBreakdownJson is always { items, promoCode? }.
  const holdBreakdownJson: Prisma.InputJsonValue = promoResult
    ? ({ items: [...pricing.breakdown, promoResult.promoLine], promoCode: args.promoContext!.promo.code } as unknown as Prisma.InputJsonValue)
    : ({ items: JSON.parse(JSON.stringify(pricing.breakdown)) } as unknown as Prisma.InputJsonValue);

  return { startAt, endAt, activeHold, pricing, effectiveTotal, pricingBreakdownJson, holdBreakdownJson, promoResult };
}

// ---------------------------------------------------------------------------
// Hold pricingBreakdownJson is always { items: BreakdownItem[], promoCode?: string }.
// (Plain-array shape was normalized away — all writers now produce the object form.)
function extractHoldPromoCode(pricingBreakdownJson: unknown): string | undefined {
  if (pricingBreakdownJson && typeof pricingBreakdownJson === "object" && !Array.isArray(pricingBreakdownJson)) {
    const json = pricingBreakdownJson as Record<string, unknown>;
    if (typeof json.promoCode === "string") return json.promoCode;
  }
  return undefined;
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

      const customerUser = await tx.user.findUnique({
        where: { id: input.customerUserId },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          walletBalance: true,
        },
      });

      if (!customerUser) {
        throw new Error("Пользователь аккаунта не найден");
      }

      const dbComponentPrices = await tx.componentPrice.findMany({
        where: {
          locationId: input.locationId,
          sportId: service.sportId,
          currency: "KZT",
          componentType: { in: ["court", "instructor"] },
        },
        include: { sport: { select: { slug: true } } },
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

      // Determine effective promo code: explicit input or inherited from hold.
      // Resolve hold first (if any) to extract its promo code, then build promoContext.
      const preHold = input.holdId
        ? await resolveValidatedActiveHold({
            holdId: input.holdId,
            customerId: customerUser.id,
            serviceId: service.id,
            locationId: input.locationId,
            courtId: input.courtId,
            instructorId: input.instructorId,
            startAt,
            endAt,
            tx,
          })
        : null;

      const effectivePromoCode = input.promoCode ?? extractHoldPromoCode(preHold?.pricingBreakdownJson);

      let promoRecord: PrismaPromoCode | undefined;
      let promoContextForSlot: PrepareBookingSlotArgs["promoContext"] | undefined;

      if (effectivePromoCode) {
        const promo = await tx.promoCode.findUnique({ where: { code: effectivePromoCode } });
        if (!promo) throw new PromoIneligibleError("not_found", PROMO_ERROR_MESSAGES.not_found);
        promoRecord = promo;

        // Serialize concurrent promo redemptions — row lock before reading counts.
        await (tx as unknown as { $queryRaw: typeof prisma.$queryRaw }).$queryRaw`
          SELECT id FROM "PromoCode" WHERE id = ${promo.id} FOR UPDATE
        `;

        const [customerRedemptionCount, totalRedemptionCount, existingBookingsCount] = await Promise.all([
          tx.promoCodeRedemption.count({ where: { promoCodeId: promo.id, customerId: customerUser.id } }),
          tx.promoCodeRedemption.count({ where: { promoCodeId: promo.id } }),
          tx.booking.count({ where: { customerId: customerUser.id, status: { not: "cancelled" } } }),
        ]);

        promoContextForSlot = {
          promo,
          existingCustomerRedemptions: customerRedemptionCount,
          existingTotalRedemptions: totalRedemptionCount,
          isFirstBooking: existingBookingsCount === 0,
        };
      }

      // prepareBookingSlot will re-resolve the hold (idempotent); we pass holdId so it
      // performs the excludeHoldId conflict exclusion correctly.
      const prepared = await prepareBookingSlot({
        tx,
        service,
        locationId: input.locationId,
        date: input.date,
        startTime: input.startTime,
        durationMin: input.durationMin,
        courtId: input.courtId,
        instructorId: input.instructorId,
        holdId: input.holdId,
        customerId: customerUser.id,
        startAt,
        endAt,
        componentPrices,
        serviceRecord,
        instructorPriceOverrideAmount,
        promoContext: promoContextForSlot,
      });

      const { activeHold, pricing, effectiveTotal, pricingBreakdownJson, holdBreakdownJson, promoResult: promoApplyResult } = prepared;

      const currentBalanceKzt = Number(customerUser.walletBalance);
      const effectiveSettlementMode: BookingSettlementMode =
        requestedPaymentMode === "cash"
          ? "cash_paid"
          : requestedPaymentMode === "auto"
            ? currentBalanceKzt >= effectiveTotal
              ? "wallet_paid"
              : "manual_unpaid"
            : "wallet_paid";

      if (requestedPaymentMode === "wallet" && currentBalanceKzt < effectiveTotal) {
        const hold =
          activeHold ??
          (await createBookingHold(
            {
              customerId: customerUser.id,
              serviceId: service.id,
              locationId: input.locationId,
              startAt,
              endAt,
              amountRequiredKzt: effectiveTotal,
              pricingBreakdownJson: holdBreakdownJson,
              courtId: input.courtId,
              instructorId: input.instructorId,
            },
            tx,
          ));

        return {
          insufficientWallet: {
            holdId: hold.id,
            currentBalanceKzt,
            amountRequiredKzt: effectiveTotal,
            shortfallKzt: effectiveTotal - currentBalanceKzt,
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
          priceTotal: effectiveTotal,
          pricingBreakdownJson,
          promoCodeId: promoRecord?.id,
          discountKzt: promoApplyResult?.discountKzt,
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
              status: effectiveSettlementMode === "wallet_paid" ? "paid" : "unpaid",
              amount: effectiveTotal,
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

      if (promoApplyResult && promoRecord) {
        await tx.promoCodeRedemption.create({
          data: {
            promoCodeId: promoRecord.id,
            customerId: customerUser.id,
            bookingId: booking.id,
            amountKzt: promoApplyResult.discountKzt,
          },
        });
      }

      if (effectiveSettlementMode === "wallet_paid") {
        await debitUserWallet({
          tx,
          userId: customerUser.id,
          amountKzt: effectiveTotal,
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

export async function createBookingSeriesInDb(
  input: CreateBookingSeriesPersistentInput,
): Promise<CreateBookingSeriesInDbResult> {
  if (input.durationMin !== 60) {
    throw new Error("Поддерживается только сессия 60 минут");
  }
  if (input.slots.length === 0) {
    throw new Error("Не выбраны слоты для бронирования");
  }

  const seenSlotKeys = new Set<string>();
  for (const slot of input.slots) {
    if (!/^\d{2}:00$/.test(slot.startTime)) {
      throw new Error("Поддерживаются только часовые слоты (например, 09:00)");
    }
    const slotKey = `${slot.startTime}:${slot.courtId}`;
    if (seenSlotKeys.has(slotKey)) {
      throw new Error("Слот не может повторяться в одном бронировании");
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
  if (service.requiresInstructor) {
    const seenStartTimes = new Set<string>();
    for (const slot of input.slots) {
      if (seenStartTimes.has(slot.startTime)) {
        throw new Error("Тренер может быть назначен только на один корт в одно время");
      }
      seenStartTimes.add(slot.startTime);
    }
  }

  const uniqueCourtIds = Array.from(new Set(input.slots.map((slot) => slot.courtId)));
  const resourceLocks = [
    ...uniqueCourtIds.map((courtId) => ({ resourceType: "court" as const, resourceId: courtId })),
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

      const customerUser = await tx.user.findUnique({
        where: { id: input.customerUserId },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          walletBalance: true,
        },
      });

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

      const instructorForPricing =
        service.requiresInstructor && input.instructorId
          ? await tx.instructor.findUnique({
              where: { id: input.instructorId },
              select: {
                instructorSports: {
                  where: { sportId: service.sportId },
                  select: {
                    pricePerHour: true,
                  },
                },
              },
            })
          : null;

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

      let seriesPromo: PrismaPromoCode | undefined;
      let seriesExistingCustomerRedemptions = 0;
      let seriesExistingTotalRedemptions = 0;
      let seriesIsFirstBooking = false;

      if (input.promoCode) {
        const promo = await tx.promoCode.findUnique({ where: { code: input.promoCode } });
        if (!promo) throw new PromoIneligibleError("not_found", PROMO_ERROR_MESSAGES.not_found);
        seriesPromo = promo;

        // Row-level lock to serialize concurrent series promo redemptions.
        await (tx as unknown as { $queryRaw: typeof prisma.$queryRaw }).$queryRaw`
          SELECT id FROM "PromoCode" WHERE id = ${promo.id} FOR UPDATE
        `;

        const [customerCount, totalCount, existingBookingsCount] = await Promise.all([
          tx.promoCodeRedemption.count({ where: { promoCodeId: promo.id, customerId: customerUser.id } }),
          tx.promoCodeRedemption.count({ where: { promoCodeId: promo.id } }),
          tx.booking.count({ where: { customerId: customerUser.id, status: { not: "cancelled" } } }),
        ]);

        seriesExistingCustomerRedemptions = customerCount;
        seriesExistingTotalRedemptions = totalCount;
        seriesIsFirstBooking = existingBookingsCount === 0;

        const perLimit = promo.perCustomerLimit ?? 1;
        if (perLimit > 0 && customerCount + input.slots.length > perLimit) {
          throw new PromoIneligibleError("per_customer_limit", PROMO_ERROR_MESSAGES.per_customer_limit);
        }
        if (promo.totalRedemptionLimit !== null && totalCount + input.slots.length > promo.totalRedemptionLimit) {
          throw new PromoIneligibleError("total_limit", PROMO_ERROR_MESSAGES.total_limit);
        }
      }

      const preparedSlots: Array<{ slot: CreateBookingHoldSlotInput } & PrepareBookingSlotResult> = [];
      const now = new Date();

      for (const slot of input.slots) {
        const startAt = venueDateTimeToUtc(input.date, slot.startTime);
        const endAt = new Date(startAt.getTime() + input.durationMin * 60 * 1000);
        if (startAt <= now) {
          throw new Error("Нельзя создать бронирование на прошедшее время");
        }

        const slotPromoContext: PrepareBookingSlotArgs["promoContext"] = seriesPromo
          ? {
              promo: seriesPromo,
              existingCustomerRedemptions: seriesExistingCustomerRedemptions,
              existingTotalRedemptions: seriesExistingTotalRedemptions,
              isFirstBooking: seriesIsFirstBooking,
            }
          : undefined;

        const prepared = await prepareBookingSlot({
          tx,
          service,
          locationId: input.locationId,
          date: input.date,
          startTime: slot.startTime,
          durationMin: input.durationMin,
          courtId: slot.courtId,
          instructorId: input.instructorId,
          holdId: slot.holdId,
          customerId: customerUser.id,
          startAt,
          endAt,
          componentPrices,
          serviceRecord,
          instructorPriceOverrideAmount,
          promoContext: slotPromoContext,
        });

        preparedSlots.push({ slot, ...prepared });
      }

      const totalAmount = preparedSlots.reduce((sum, slot) => sum + slot.effectiveTotal, 0);
      const currentBalanceKzt = Number(customerUser.walletBalance);
      if (currentBalanceKzt < totalAmount) {
        throw new SeriesInsufficientWalletBalanceError({
          currentBalanceKzt,
          amountRequiredKzt: totalAmount,
          shortfallKzt: totalAmount - currentBalanceKzt,
        });
      }

      const bookings: CreateBookingSeriesInDbResult["bookings"] = [];
      for (const prepared of preparedSlots) {
        const booking = await tx.booking.create({
          data: {
            customerId: customerUser.id,
            serviceId: service.id,
            locationId: input.locationId,
            startAt: prepared.startAt,
            endAt: prepared.endAt,
            status: "confirmed",
            currency: prepared.pricing.currency,
            priceTotal: prepared.effectiveTotal,
            pricingBreakdownJson: prepared.pricingBreakdownJson,
            promoCodeId: seriesPromo?.id,
            discountKzt: prepared.promoResult?.discountKzt,
            resources: {
              create: [
                { resourceType: "court" as const, resourceId: prepared.slot.courtId },
                ...(input.instructorId
                  ? [{ resourceType: "instructor" as const, resourceId: input.instructorId }]
                  : []),
              ],
            },
            payment: {
              create: {
                provider: "wallet",
                status: "paid",
                amount: prepared.effectiveTotal,
                currency: prepared.pricing.currency,
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

        if (prepared.promoResult && seriesPromo) {
          await tx.promoCodeRedemption.create({
            data: {
              promoCodeId: seriesPromo.id,
              customerId: customerUser.id,
              bookingId: booking.id,
              amountKzt: prepared.promoResult.discountKzt,
            },
          });
        }

        await debitUserWallet({
          tx,
          userId: customerUser.id,
          amountKzt: prepared.effectiveTotal,
          type: "booking_charge",
          bookingId: booking.id,
          holdId: prepared.activeHold?.id,
          note: "Оплата бронирования с баланса",
          metadataJson: {
            serviceCode: service.code,
            startAt: booking.startAt.toISOString(),
            source: "booking_series",
          },
        });

        if (prepared.activeHold) {
          await markBookingHoldStatus({
            tx,
            holdId: prepared.activeHold.id,
            status: "converted",
            convertedBookingId: booking.id,
          });
        }

        bookings.push({
          id: booking.id,
          customerId: booking.customerId,
          serviceId: booking.service.code,
          serviceDbId: booking.serviceId,
          startAtUtc: booking.startAt.toISOString(),
          endAtUtc: booking.endAt.toISOString(),
          startTime: prepared.slot.startTime,
          endTime: prepared.endAt.toISOString(),
          durationMin: input.durationMin,
          status: booking.status,
          currency: booking.currency,
          priceTotal: Number(booking.priceTotal),
          pricingBreakdownJson: booking.pricingBreakdownJson,
          resources: booking.resources.map((resource: { resourceType: "court" | "instructor"; resourceId: string }) => ({
            resourceType: resource.resourceType,
            resourceId: resource.resourceId,
          })),
        });
      }

      return {
        bookings,
        totalAmount,
        currency: "KZT",
      };
    },
  });

  await Promise.all(result.bookings.map((booking) => notifyBookingCreated({ bookingId: booking.id })));
  return result;
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
  if (service.requiresInstructor) {
    const seenStartTimes = new Set<string>();
    for (const slot of input.slots) {
      if (seenStartTimes.has(slot.startTime)) {
        throw new Error("Тренер может быть назначен только на один корт в одно время");
      }
      seenStartTimes.add(slot.startTime);
    }
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

      const customerUser = await tx.user.findUnique({
        where: { id: input.customerUserId },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
        },
      });

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

      let holdsPromo: PrismaPromoCode | undefined;
      let holdsCustomerRedemptionCount = 0;
      let holdsTotalRedemptionCount = 0;
      let holdsIsFirstBooking = false;

      if (input.promoCode) {
        const promo = await tx.promoCode.findUnique({ where: { code: input.promoCode } });
        if (!promo) throw new PromoIneligibleError("not_found", PROMO_ERROR_MESSAGES.not_found);
        holdsPromo = promo;

        // Row-level lock to serialize concurrent holds promo redemptions.
        await (tx as unknown as { $queryRaw: typeof prisma.$queryRaw }).$queryRaw`
          SELECT id FROM "PromoCode" WHERE id = ${promo.id} FOR UPDATE
        `;

        const [customerCount, totalCount, existingBookingsCount] = await Promise.all([
          tx.promoCodeRedemption.count({ where: { promoCodeId: promo.id, customerId: customerUser.id } }),
          tx.promoCodeRedemption.count({ where: { promoCodeId: promo.id } }),
          tx.booking.count({ where: { customerId: customerUser.id, status: { not: "cancelled" } } }),
        ]);

        holdsCustomerRedemptionCount = customerCount;
        holdsTotalRedemptionCount = totalCount;
        holdsIsFirstBooking = existingBookingsCount === 0;
      }

      const holdsPromoContext: PrepareBookingSlotArgs["promoContext"] = holdsPromo
        ? {
            promo: holdsPromo,
            existingCustomerRedemptions: holdsCustomerRedemptionCount,
            existingTotalRedemptions: holdsTotalRedemptionCount,
            isFirstBooking: holdsIsFirstBooking,
          }
        : undefined;

      const holds = [];
      for (const slot of input.slots) {
        const startAt = venueDateTimeToUtc(input.date, slot.startTime);
        const endAt = new Date(startAt.getTime() + 60 * 60 * 1000);

        const prepared = await prepareBookingSlot({
          tx,
          service,
          locationId: input.locationId,
          date: input.date,
          startTime: slot.startTime,
          durationMin: input.durationMin,
          courtId: slot.courtId,
          instructorId: input.instructorId,
          holdId: slot.holdId,
          customerId: customerUser.id,
          startAt,
          endAt,
          componentPrices,
          serviceRecord,
          instructorPriceOverrideAmount,
          promoContext: holdsPromoContext,
        });

        const hold =
          prepared.activeHold ??
          (await createBookingHold(
            {
              customerId: customerUser.id,
              serviceId: service.id,
              locationId: input.locationId,
              startAt,
              endAt,
              amountRequiredKzt: prepared.effectiveTotal,
              pricingBreakdownJson: prepared.holdBreakdownJson,
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
