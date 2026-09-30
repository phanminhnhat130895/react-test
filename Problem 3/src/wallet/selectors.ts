import { formatAmount, formatUsd, Money } from "./format";
import type { PreparedBalance, Prices, Valuation, WalletBalance } from "./types";

const PRIORITIES: ReadonlyMap<string, number> = new Map([
  ["Osmosis", 100], ["Ethereum", 50], ["Arbitrum", 30],
  ["Zilliqa", 20], ["Neo", 20],
]);
export const MAX_QUOTE_AGE_MS = 120_000;

export function prepareBalances(balances: readonly WalletBalance[]): PreparedBalance[] {
  const result: PreparedBalance[] = [];
  for (const balance of balances) {
    const priority = PRIORITIES.get(balance.blockchain);
    if (priority === undefined || !new Money(balance.amount).gt(0)) continue;
    result.push({ ...balance, priority, formattedAmount: formatAmount(balance.amount) });
  }
  // Stable, deterministic tie-break independent of API response order.
  return result.sort((a, b) =>
    b.priority - a.priority || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
  );
}

export function valueBalance(balance: WalletBalance, prices: Prices | undefined, now: number): Valuation {
  const quote = prices && Object.hasOwn(prices, balance.assetId)
    ? prices[balance.assetId] : undefined;
  if (!quote) return { status: "missing" };
  const age = now - Date.parse(quote.asOf);
  if (!Number.isFinite(age) || age > MAX_QUOTE_AGE_MS || age < -60_000) {
    return { status: "stale" };
  }
  return {
    status: "available",
    formatted: formatUsd(new Money(balance.amount).times(quote.usd)),
    asOf: quote.asOf,
  };
}
