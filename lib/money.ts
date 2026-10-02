/**
 * Money math in integer paise (₹1 = 100 paise)
 * NEVER uses floating-point money math.
 */

export function rupeesToPaise(rupees: number | string): number {
  if (typeof rupees === "string") {
    rupees = parseFloat(rupees.replace(/[^\d.-]/g, "")) || 0;
  }
  return Math.round(rupees * 100);
}

export function paiseToRupees(paise: number): number {
  return paise / 100;
}

export function formatPaise(paise: number): string {
  const rupees = paise / 100;
  if (Number.isInteger(rupees)) {
    return `₹${rupees.toLocaleString("en-IN")}`;
  }
  return `₹${rupees.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function calculateLineTotal(
  quantity: number | string,
  unitPricePaise: number
): number {
  const qty = typeof quantity === "string" ? parseFloat(quantity) : quantity;
  if (isNaN(qty) || qty <= 0) return 0;
  return Math.round(qty * unitPricePaise);
}

export function calculateOrderTotals(
  items: Array<{
    lineTotalPaise?: number;
    quantity?: number | string;
    unitPricePaiseSnapshot?: number | null;
    matchStatus?: string;
  }>
): { subtotalPaise: number; totalPaise: number } {
  let subtotalPaise = 0;
  for (const item of items) {
    if (item.matchStatus === "MATCHED" || !item.matchStatus) {
      if (item.lineTotalPaise !== undefined) {
        subtotalPaise += item.lineTotalPaise;
      } else if (item.unitPricePaiseSnapshot && item.quantity) {
        subtotalPaise += calculateLineTotal(
          item.quantity,
          item.unitPricePaiseSnapshot
        );
      }
    }
  }
  return {
    subtotalPaise,
    totalPaise: subtotalPaise, // No hidden fees, delivery policy handled cleanly
  };
}
