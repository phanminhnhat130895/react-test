export interface WalletBalance {
  readonly id: string;
  readonly assetId: string;
  readonly blockchain: string;
  readonly currency: string;
  /** Exact decimal string: at most 18 integer and 18 fractional digits. */
  readonly amount: string;
}

export interface PriceQuote {
  readonly assetId: string;
  readonly usd: string;
  readonly asOf: string;
}

export type Prices = Readonly<Record<string, PriceQuote | undefined>>;

export interface PreparedBalance extends WalletBalance {
  readonly priority: number;
  readonly formattedAmount: string;
}

export type Valuation =
  | { readonly status: "available"; readonly formatted: string; readonly asOf: string }
  | { readonly status: "missing" | "stale" };

export interface WalletSource {
  /** Must change when the API, authenticated account, or tenant changes. */
  readonly key: string;
  readonly label: string;
  readonly loadBalances: (signal: AbortSignal) => Promise<unknown>;
  readonly loadPrices: (signal: AbortSignal) => Promise<unknown>;
}
