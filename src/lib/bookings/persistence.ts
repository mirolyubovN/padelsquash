import { withBookingConcurrencyGuard } from "@/src/lib/bookings/concurrency";
import type { ComponentPriceRecord, ServiceRecord } from "@/src/lib/domain/types";
import { evaluatePricing } from "@/src/lib/pricing/engine";
import { prisma } from "@/src/lib/prisma";
import { getPaymentProvider } from "@/src/lib/payments/factory";
import { venueDateTimeToUtc } from "@/src/lib/time/venue-timezone";

interface CreateBookingPersistentInput {
  serviceCode: string;
  locationId: string;
  date: string;
  startTime: string;
  durationMin: number;
  courtId?: string;
  instructorId?: string;
  customerUserId?: string;
  customer: {
    name: string;
    email: string;
    phone: string;
  };
}

export async function createBookingInDb(input: CreateBookingPersistentInput) {
  if (input.durationMin !== 60) {
    throw new Error("Поддерживается только сессия 60 минут");
  }
  if (!/^\d{2}:00$/.test(input.startTime)) {
    throw new Error("Поддерживаются только часовые слоты (например, 09:00)");
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

  if (service.requiresCourt && !input.courtId) {
    throw new Error("Для выбранной услуги требуется courtId");
  }
  if (service.requiresInstructor && !input.instructorId) {
    throw new Error("Для выбранной услуги требуется instructorId");
  }

  const selectedCourt =
    input.courtId
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

  const resourceLocks = [
    ...(input.courtId ? [{ resourceType: "court" as const, resourceId: input.courtId }] : []),
    ...(input.instructorId
      ? [{ resourceType: "instructor" as const, resourceId: input.instructorId }]
      : []),
  ];

  return withBookingConcurrencyGuard({
    prisma,
    resourceLocks,
    run: async (txUnknown) => {
      const tx = txUnknown as typeof prisma;

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

      const customerUser = input.customerUserId
        ? await tx.user.findUnique({
            where: { id: input.customerUserId },
          })
        : (await tx.user.findUnique({ where: { email: input.customer.email } })) ??
          (await tx.user.create({
            data: {
              name: input.customer.name,
              email: input.customer.email,
              phone: input.customer.phone,
              passwordHash: "guest-booking-placeholder",
              role: "customer",
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
      const pricingBreakdownJson = JSON.parse(JSON.stringify(pricing.breakdown));

      const provider = getPaymentProvider("placeholder");
      const paymentPreview = await provider.createPayment({
        bookingId: `draft-${Date.now()}`,
        amount: pricing.total,
        currency: pricing.currency,
        customerEmail: customerUser.email,
      });

      const booking = await tx.booking.create({
        data: {
          customerId: customerUser.id,
          serviceId: service.id,
          locationId: input.locationId,
          startAt,
          endAt,
          status: paymentPreview.bookingStatus,
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
          ...(process.env.PAYMENTS_ENABLED === "true"
            ? {
                payment: {
                  create: {
                    provider: paymentPreview.provider,
                    status: paymentPreview.status,
                    amount: pricing.total,
                    currency: pricing.currency,
                    providerPaymentId: paymentPreview.providerPaymentId,
                  },
                },
              }
            : {}),
        },
        include: {
          resources: true,
          payment: true,
          service: true,
        },
      });

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
        payment: booking.payment
          ? {
              id: booking.payment.id,
              provider: booking.payment.provider,
              status: booking.payment.status,
              amount: Number(booking.payment.amount),
              currency: booking.payment.currency,
              providerPaymentId: booking.payment.providerPaymentId,
              message: paymentPreview.message,
            }
          : {
              provider: paymentPreview.provider,
              status: "paid",
              amount: pricing.total,
              currency: pricing.currency,
              providerPaymentId: null,
              message: paymentPreview.message,
            },
      };
    },
  });
}
