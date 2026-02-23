import type { CreatePaymentRequest, CreatePaymentResult, PaymentProvider } from "@/src/lib/payments/provider";

export class KaspiProvider implements PaymentProvider {
  readonly name = "kaspi" as const;

  async createPayment(request: CreatePaymentRequest): Promise<CreatePaymentResult> {
    void request;
    // TODO: Реализовать интеграцию с Kaspi API после подтверждения протокола и юридических требований.
    throw new Error("KaspiProvider еще не реализован.");
  }
}
