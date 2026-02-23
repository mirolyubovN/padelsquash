import type { BookingStatus } from "@/src/lib/domain/types";

export type PaymentProviderName = "placeholder" | "kaspi" | "freedom";
export type PaymentRecordStatus = "unpaid" | "paid" | "failed" | "refunded";

export interface CreatePaymentRequest {
  bookingId: string;
  amount: number;
  currency: string;
  customerEmail?: string;
}

export interface CreatePaymentResult {
  provider: PaymentProviderName;
  providerPaymentId: string | null;
  status: PaymentRecordStatus;
  bookingStatus: BookingStatus;
  redirectUrl: string | null;
  message: string;
}

export interface PaymentProvider {
  readonly name: PaymentProviderName;
  createPayment(request: CreatePaymentRequest): Promise<CreatePaymentResult>;
}
