import { describe, it, expect } from "vitest";
import {
  rupeesToPaise,
  paiseToRupees,
  formatPaise,
  calculateLineTotal,
  calculateOrderTotals,
} from "../../lib/money";

describe("Money Math (Paise) Unit Tests", () => {
  it("converts rupees to integer paise without floating point inaccuracy", () => {
    expect(rupeesToPaise(52.5)).toBe(5250);
    expect(rupeesToPaise(230)).toBe(23000);
    expect(rupeesToPaise("₹48.00")).toBe(4800);
    expect(rupeesToPaise("145.25")).toBe(14525);
  });

  it("converts paise to rupees accurately", () => {
    expect(paiseToRupees(5250)).toBe(52.5);
    expect(paiseToRupees(23000)).toBe(230);
  });

  it("formats paise to Indian Rupee strings correctly", () => {
    expect(formatPaise(23000)).toBe("₹230");
    expect(formatPaise(5850)).toBe("₹58.50");
    expect(formatPaise(4800)).toBe("₹48");
    expect(formatPaise(100000)).toBe("₹1,000");
  });

  it("computes line item totals accurately with decimal quantities", () => {
    // 0.5 kg at ₹48 (4800 paise) = ₹24 (2400 paise)
    expect(calculateLineTotal(0.5, 4800)).toBe(2400);

    // 2 kg at ₹230 (23000 paise) = ₹460 (46000 paise)
    expect(calculateLineTotal(2, 23000)).toBe(46000);

    // 1.5 L at ₹145 (14500 paise) = ₹217.50 (21750 paise)
    expect(calculateLineTotal(1.5, 14500)).toBe(21750);
  });

  it("calculates order subtotal and grand total only for matched items", () => {
    const items = [
      { matchStatus: "MATCHED", lineTotalPaise: 46000 },
      { matchStatus: "MATCHED", lineTotalPaise: 5800 },
      { matchStatus: "AMBIGUOUS", lineTotalPaise: 0 },
      { matchStatus: "OUT_OF_STOCK", lineTotalPaise: 0 },
    ];

    const totals = calculateOrderTotals(items);
    expect(totals.subtotalPaise).toBe(51800);
    expect(totals.totalPaise).toBe(51800);
  });
});
