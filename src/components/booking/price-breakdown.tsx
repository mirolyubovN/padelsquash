import { formatMoneyKzt } from "@/src/lib/format/money";
import { t } from "@/src/lib/i18n";

export type PriceBreakdownLine = { key: string; label: string; total: number };

export function PriceBreakdown({
  lines,
  total,
  totalLabel = t("booking.priceBreakdown.total"),
}: {
  lines: PriceBreakdownLine[];
  total: number;
  totalLabel?: string;
}) {
  return (
    <div className="booking-flow__breakdown">
      {lines.map((line) => (
        <div key={line.key} className="booking-flow__breakdown-row">
          <span>{line.label}</span>
          <span>{formatMoneyKzt(line.total)}</span>
        </div>
      ))}
      <div className="booking-flow__breakdown-row booking-flow__breakdown-row--total">
        <span>{totalLabel}</span>
        <span>{formatMoneyKzt(total)}</span>
      </div>
    </div>
  );
}
