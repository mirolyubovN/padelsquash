import { evaluatePricing } from "@/src/lib/pricing/engine";
import { getPaymentProvider } from "@/src/lib/payments/factory";
import type { ComponentPriceRecord, ServiceRecord } from "@/src/lib/domain/types";
export {
  canCustomerCancelBooking,
  CUSTOMER_FREE_CANCELLATION_HOURS,
  getSafeCustomerFreeCancellationHours,
} from "@/src/lib/bookings/policy";

interface CreateBookingMvpInput {
  customerId: string;
  service: ServiceRecord;
  date: string;
  startTime: string;
  durationMin: number;
  courtId?: string;
  instructorId?: string;
  componentPrices: ComponentPriceRecord[];
  customer: {
    email: string;
    name: string;
    phone: string;
  };
}

export async function createBookingMvp(input: CreateBookingMvpInput) {
  const pricing = evaluatePricing({
    service: input.service,
    bookingDate: input.date,
    bookingStartTime: input.startTime,
    durationMin: input.durationMin,
    componentPrices: input.componentPrices,
    currency: "KZT",
  });

  const provider = getPaymentProvider("placeholder");
  const paymentResult = await provider.createPayment({
    bookingId: `draft-${Date.now()}`,
    amount: pricing.total,
    currency: pricing.currency,
    customerEmail: input.customer.email,
  });

  return {
    booking: {
      id: `draft-${Math.random().toString(36).slice(2, 10)}`,
      customerId: input.customerId,
      serviceId: input.service.id,
      startAtLocal: `${input.date}T${input.startTime}:00`,
      durationMin: input.durationMin,
      status: paymentResult.bookingStatus,
      currency: pricing.currency,
      priceTotal: pricing.total,
      pricingBreakdownJson: pricing.breakdown,
      resources: [
        ...(input.courtId ? [{ resourceType: "court" as const, resourceId: input.courtId }] : []),
        ...(input.instructorId
          ? [{ resourceType: "instructor" as const, resourceId: input.instructorId }]
          : []),
      ],
    },
    payment: {
      provider: paymentResult.provider,
      status: paymentResult.status,
      amount: pricing.total,
      currency: pricing.currency,
      providerPaymentId: paymentResult.providerPaymentId,
      message: paymentResult.message,
    },
  };
}

/*
 Production booking creation outline (implemented in next slice with Prisma persistence):

 1. Start transaction with SERIALIZABLE isolation.
 2. Acquire pg_advisory_xact_lock for each participating resource (court / instructor).
 3. Re-check overlap for statuses pending_payment + confirmed.
 4. Insert Booking + BookingResource rows + Payment row (if payments enabled).
 5. Commit transaction.

 See src/lib/bookings/concurrency.ts for the lock helper used to serialize competing requests.
*/
