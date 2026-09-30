import Decimal from "decimal.js";

// Two validated inputs contain at most 36 significant digits each.
// Their product fits within this precision without binary float conversion.
export const Money = Decimal.clone({ precision: 80, rounding: Decimal.ROUND_HALF_UP });

export function formatAmount(amount: string): string {
  return new Money(amount).toFixed();
}

export function formatUsd(amount: InstanceType<typeof Money>): string {
  if (amount.gt(0) && amount.lt("0.01")) return "<$0.01";
  const [whole = "0", fraction = "00"] = amount.toFixed(2).split(".");
  return `$${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}.${fraction}`;
}
