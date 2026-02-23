import { FreedomProvider } from "@/src/lib/payments/freedom-provider";
import { KaspiProvider } from "@/src/lib/payments/kaspi-provider";
import { PlaceholderProvider } from "@/src/lib/payments/placeholder-provider";
import type { PaymentProvider, PaymentProviderName } from "@/src/lib/payments/provider";

export function getPaymentProvider(name: PaymentProviderName = "placeholder"): PaymentProvider {
  switch (name) {
    case "kaspi":
      return new KaspiProvider();
    case "freedom":
      return new FreedomProvider();
    case "placeholder":
    default:
      return new PlaceholderProvider();
  }
}
