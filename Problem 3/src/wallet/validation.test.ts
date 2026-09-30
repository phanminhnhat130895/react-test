import { describe, expect, it } from "vitest";
import { parseBalances, parsePrices } from "./validation";

const balance = { id: "one", assetId: "ethereum:eth", currency: "ETH", blockchain: "Ethereum", amount: "1.25" };
const now = Date.parse("2026-01-01T00:00:00Z");
const quote = { assetId: "ethereum:eth", usd: "2500", asOf: new Date(now).toISOString() };

describe("API boundary validation", () => {
  it("accepts empty responses", () => {
    expect(parseBalances([])).toEqual([]);
    expect(parsePrices([], now)).toEqual({});
  });
  it("preserves exact decimals", () => {
    expect(parseBalances([{ ...balance, amount: "999999999999999999.123456789012345678" }])[0]?.amount)
      .toBe("999999999999999999.123456789012345678");
  });
  it.each([null, {}, [{ ...balance, blockchain: undefined }], [{ ...balance, id: " " }]])("rejects malformed balances: %j", (input) => {
    expect(() => parseBalances(input)).toThrow(/invalid format/);
  });
  it.each([1.25, NaN, Infinity, "NaN", "Infinity", "1e3", "0xFF", "", "01", "1.0000000000000000001", "1000000000000000000"])("rejects unsupported amount %s", (amount) => {
    expect(() => parseBalances([{ ...balance, amount }])).toThrow();
  });
  it("rejects duplicate balance IDs but permits the same asset in separate positions", () => {
    expect(() => parseBalances([balance, balance])).toThrow(/duplicate/);
    expect(parseBalances([balance, { ...balance, id: "two" }])).toHaveLength(2);
  });
  it("rejects negative prices, duplicate quotes and invalid/future timestamps", () => {
    expect(() => parsePrices([{ ...quote, usd: "-1" }], now)).toThrow();
    expect(() => parsePrices([quote, quote], now)).toThrow(/duplicate/);
    expect(() => parsePrices([{ ...quote, asOf: "yesterday" }], now)).toThrow();
    expect(() => parsePrices([{ ...quote, asOf: new Date(now + 60_001).toISOString() }], now)).toThrow(/future/);
  });
  it("supports a real zero price and does not trust object prototype keys", () => {
    const prices = parsePrices([{ ...quote, assetId: "__proto__", usd: "0" }], now);
    expect(Object.hasOwn(prices, "__proto__")).toBe(true);
    expect(prices["__proto__"]?.usd).toBe("0");
    expect(Object.getPrototypeOf(prices)).toBe(Object.prototype);
  });
});
