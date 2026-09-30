import { act, renderHook } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { useNow } from "./useNow";
import { valueBalance } from "../selectors";

afterEach(() => vi.useRealTimers());

it("expires a quote without a new response and cleans up its interval", () => {
  vi.useFakeTimers();
  const initial = Date.parse("2026-01-01T00:00:00Z");
  vi.setSystemTime(initial);
  const balance = { id: "one", assetId: "eth", currency: "ETH", blockchain: "Ethereum", amount: "1" };
  const prices = { eth: { assetId: "eth", usd: "1", asOf: new Date(initial - 119_500).toISOString() } };
  const { result, unmount } = renderHook(useNow);
  expect(valueBalance(balance, prices, result.current).status).toBe("available");
  act(() => vi.advanceTimersByTime(1000));
  expect(valueBalance(balance, prices, result.current).status).toBe("stale");
  unmount();
  expect(vi.getTimerCount()).toBe(0);
});

it("updates immediately on focus after time passes in the background", () => {
  vi.useFakeTimers();
  const { result } = renderHook(useNow);
  const later = result.current + 300_000;
  vi.setSystemTime(later);
  act(() => window.dispatchEvent(new Event("focus")));
  expect(result.current).toBe(later);
});
