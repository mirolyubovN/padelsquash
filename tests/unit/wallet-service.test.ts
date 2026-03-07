import { describe, expect, it } from "vitest";
import {
  calculateWalletTopUpBonus,
  DEFAULT_WALLET_TOP_UP_BONUS_PERCENT,
  DEFAULT_WALLET_TOP_UP_BONUS_THRESHOLD_KZT,
} from "@/src/lib/wallet/service";

describe("wallet bonus calculation", () => {
  it("does not apply a bonus below the threshold", () => {
    const bonus = calculateWalletTopUpBonus(49_999, {
      thresholdKzt: DEFAULT_WALLET_TOP_UP_BONUS_THRESHOLD_KZT,
      bonusPercent: DEFAULT_WALLET_TOP_UP_BONUS_PERCENT,
      active: true,
    });

    expect(bonus).toBe(0);
  });

  it("applies the configured percentage at the threshold", () => {
    const bonus = calculateWalletTopUpBonus(50_000, {
      thresholdKzt: DEFAULT_WALLET_TOP_UP_BONUS_THRESHOLD_KZT,
      bonusPercent: DEFAULT_WALLET_TOP_UP_BONUS_PERCENT,
      active: true,
    });

    expect(bonus).toBe(5_000);
  });

  it("skips the bonus when the program is disabled", () => {
    const bonus = calculateWalletTopUpBonus(80_000, {
      thresholdKzt: DEFAULT_WALLET_TOP_UP_BONUS_THRESHOLD_KZT,
      bonusPercent: DEFAULT_WALLET_TOP_UP_BONUS_PERCENT,
      active: false,
    });

    expect(bonus).toBe(0);
  });
});
