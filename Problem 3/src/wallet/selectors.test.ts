import { describe, expect, it } from "vitest";
import { Money, formatAmount, formatUsd } from "./format";
import { MAX_QUOTE_AGE_MS, prepareBalances, valueBalance } from "./selectors";
import type { WalletBalance } from "./types";

const balance: WalletBalance = { id: "eth", assetId: "ethereum:eth", currency: "ETH", blockchain: "Ethereum", amount: "0.1" };
const now = Date.parse("2026-01-01T00:00:00Z");
const quote = { assetId: balance.assetId, usd: "0.2", asOf: new Date(now).toISOString() };

describe("balance preparation", () => {
  it("keeps only positive supported balances and never mutates input", () => {
    const input = Object.freeze([
      Object.freeze(balance),
      { ...balance, id: "zero", amount: "0" },
      { ...balance, id: "negative", amount: "-1" },
      { ...balance, id: "unknown", blockchain: "Unknown" },
    ]);
    expect(prepareBalances(input).map((row) => row.id)).toEqual(["eth"]);
    expect(input).toHaveLength(4);
    expect(balance).not.toHaveProperty("priority");
  });
  it("sorts priorities descending with deterministic equal-priority order", () => {
    const input = [
      { ...balance, id: "z", blockchain: "Zilliqa" },
      balance,
      { ...balance, id: "o", blockchain: "Osmosis" },
      { ...balance, id: "a", blockchain: "Neo" },
      { ...balance, id: "arb", blockchain: "Arbitrum" },
    ];
    expect(prepareBalances(input).map((row) => row.id)).toEqual(["o", "eth", "arb", "a", "z"]);
    expect(prepareBalances([...input].reverse()).map((row) => row.id)).toEqual(["o", "eth", "arb", "a", "z"]);
  });
});

describe("exact amounts and USD valuations", () => {
  it("preserves tiny balances and avoids binary floating-point multiplication", () => {
    expect(formatAmount("0.000000000000000001")).toBe("0.000000000000000001");
    expect(new Money("0.1").times("0.2").toFixed()).toBe("0.02");
    expect(valueBalance(balance, { [balance.assetId]: quote }, now)).toMatchObject({ formatted: "$0.02" });
  });
  it("handles missing prices, prototype names, zero prices and rounding", () => {
    expect(valueBalance(balance, undefined, now).status).toBe("missing");
    expect(valueBalance({ ...balance, assetId: "toString" }, {}, now).status).toBe("missing");
    expect(valueBalance(balance, { [balance.assetId]: { ...quote, usd: "0" } }, now)).toMatchObject({ formatted: "$0.00" });
    expect(formatUsd(new Money("1234.565"))).toBe("$1,234.57");
    expect(formatUsd(new Money("0.000000001"))).toBe("<$0.01");
  });
  it("does not confuse identical symbols on different chains", () => {
    expect(valueBalance({ ...balance, assetId: "arbitrum:eth" }, { [balance.assetId]: quote }, now).status).toBe("missing");
  });
  it("expires quotes at the documented boundary and rejects future clock skew", () => {
    const prices = { [balance.assetId]: quote };
    expect(valueBalance(balance, prices, now + MAX_QUOTE_AGE_MS).status).toBe("available");
    expect(valueBalance(balance, prices, now + MAX_QUOTE_AGE_MS + 1).status).toBe("stale");
    expect(valueBalance(balance, prices, now - 60_001).status).toBe("stale");
  });
  it("multiplies maximum-sized validated values without scientific notation or Infinity", () => {
    const large = "999999999999999999.999999999999999999";
    expect(new Money(large).times(large).toFixed()).toBe(
      "999999999999999999999999999999999998.000000000000000000000000000000000001",
    );
    expect(formatUsd(new Money(large).times(large))).toBe("$999,999,999,999,999,999,999,999,999,999,999,998.00");
  });
});
