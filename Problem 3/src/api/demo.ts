import type { WalletSource } from "../wallet/types";

const balances = [
  { id: "osmosis-osmo", assetId: "osmosis:osmo", blockchain: "Osmosis", currency: "OSMO", amount: "1284.375" },
  { id: "ethereum-eth", assetId: "ethereum:eth", blockchain: "Ethereum", currency: "ETH", amount: "1.250000000000000001" },
  { id: "ethereum-dust", assetId: "ethereum:tiny", blockchain: "Ethereum", currency: "TINY", amount: "0.000000000000000001" },
  { id: "arbitrum-eth", assetId: "arbitrum:eth", blockchain: "Arbitrum", currency: "ETH", amount: "0.75" },
  { id: "neo-neo", assetId: "neo:neo", blockchain: "Neo", currency: "NEO", amount: "12" },
  { id: "zilliqa-zil", assetId: "zilliqa:zil", blockchain: "Zilliqa", currency: "ZIL", amount: "4200.125" },
  { id: "zero", assetId: "ethereum:zero", blockchain: "Ethereum", currency: "ZERO", amount: "0" },
  { id: "negative", assetId: "ethereum:debt", blockchain: "Ethereum", currency: "DEBT", amount: "-2" },
  { id: "unsupported", assetId: "other:token", blockchain: "Other", currency: "OTHER", amount: "10" },
];

async function pause(signal: AbortSignal): Promise<void> {
  signal.throwIfAborted();
  await new Promise<void>((resolve, reject) => {
    const onAbort = () => {
      clearTimeout(timer);
      reject(signal.reason);
    };
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, 350);
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

export const demoSource: WalletSource = {
  key: "demo",
  label: "Sample data · illustrative prices",
  async loadBalances(signal) {
    await pause(signal);
    return balances;
  },
  async loadPrices(signal) {
    await pause(signal);
    const asOf = new Date().toISOString();
    return [
      { assetId: "osmosis:osmo", usd: "0.5", asOf },
      { assetId: "ethereum:eth", usd: "2500", asOf },
      { assetId: "ethereum:tiny", usd: "0.1", asOf },
      { assetId: "arbitrum:eth", usd: "2500", asOf },
      // NEO intentionally has no quote; ZIL intentionally has an expired quote.
      { assetId: "zilliqa:zil", usd: "0.02", asOf: new Date(Date.now() - 300_000).toISOString() },
    ];
  },
};
