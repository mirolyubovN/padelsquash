import type { CreatePaymentRequest, CreatePaymentResult, PaymentProvider } from "@/src/lib/payments/provider";

export class PlaceholderProvider implements PaymentProvider {
  readonly name = "placeholder" as const;

  async createPayment(request: CreatePaymentRequest): Promise<CreatePaymentResult> {
    const paymentsEnabled = process.env.PAYMENTS_ENABLED === "true";

    if (!paymentsEnabled) {
      return {
        provider: this.name,
        providerPaymentId: null,
        status: "paid",
        bookingStatus: "confirmed",
        redirectUrl: null,
        message: "Платежи отключены: бронь подтверждена без оплаты.",
      };
    }

    return {
      provider: this.name,
      providerPaymentId: `placeholder-${request.bookingId}`,
      status: "unpaid",
      bookingStatus: "pending_payment",
      redirectUrl: null,
      message: "Оплата временно недоступна. Администратор свяжется с вами для подтверждения.",
    };
  }
}
