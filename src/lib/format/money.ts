const KZT_SYMBOL = "\u20B8";

export function formatMoneyKzt(amount: number): string {
  return `${amount.toLocaleString("ru-KZ")} ${KZT_SYMBOL}`;
}
