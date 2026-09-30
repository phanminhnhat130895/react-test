import { demoSource } from "./demo";
import { fetchJson } from "./http";
import type { WalletSource } from "../wallet/types";

export function createHttpSource(baseUrl: string, accountScope: string): WalletSource {
  const base = baseUrl.replace(/\/+$/, "");
  return {
    key: JSON.stringify([base, accountScope]),
    label: "Connected wallet",
    loadBalances: (signal) => fetchJson(`${base}/wallet/balances`, signal),
    loadPrices: (signal) => fetchJson(`${base}/prices`, signal),
  };
}

// This standalone demo has no login/account switching. See README for integration.
export const walletSource = import.meta.env.VITE_DATA_SOURCE === "http"
  ? createHttpSource(import.meta.env.VITE_API_BASE_URL || "/api", "current-session")
  : demoSource;
