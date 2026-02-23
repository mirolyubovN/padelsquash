import type { CreatePaymentRequest, CreatePaymentResult, PaymentProvider } from "@/src/lib/payments/provider";

export class FreedomProvider implements PaymentProvider {
  readonly name = "freedom" as const;

  async createPayment(request: CreatePaymentRequest): Promise<CreatePaymentResult> {
    void request;
    // TODO: Реализовать интеграцию с Freedom Pay API после выбора провайдера и спецификации callback-потока.
    throw new Error("FreedomProvider еще не реализован.");
  }
}
