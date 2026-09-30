import { z } from "zod";
import type { Prices, WalletBalance } from "./types";

export class DataValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DataValidationError";
  }
}

// Strings deliberately reject JS floating-point inputs and scientific notation.
const decimal = z.string().regex(/^-?(0|[1-9]\d{0,17})(\.\d{1,18})?$/);
const identifier = z.string().trim().min(1).max(200);
const balanceSchema = z.object({
  id: identifier,
  assetId: identifier,
  blockchain: z.string().trim().min(1).max(80),
  currency: z.string().trim().min(1).max(32),
  amount: decimal,
});
const quoteSchema = z.object({
  assetId: identifier,
  usd: decimal.refine((value) => !value.startsWith("-"), "Price cannot be negative"),
  asOf: z.iso.datetime({ offset: true }),
});

export function parseBalances(input: unknown): readonly WalletBalance[] {
  const result = z.array(balanceSchema).max(100_000).safeParse(input);
  if (!result.success) {
    throw new DataValidationError("The balance response has an invalid format.");
  }
  const ids = new Set<string>();
  for (const balance of result.data) {
    if (ids.has(balance.id)) {
      throw new DataValidationError("The balance response contains duplicate IDs.");
    }
    ids.add(balance.id);
  }
  return result.data;
}

export function parsePrices(input: unknown, now = Date.now()): Prices {
  const result = z.array(quoteSchema).max(100_000).safeParse(input);
  if (!result.success) {
    throw new DataValidationError("The price response has an invalid format.");
  }
  const ids = new Set<string>();
  for (const quote of result.data) {
    if (ids.has(quote.assetId)) {
      throw new DataValidationError("The price response contains duplicate asset IDs.");
    }
    if (Date.parse(quote.asOf) > now + 60_000) {
      throw new DataValidationError("The price response has a future timestamp.");
    }
    ids.add(quote.assetId);
  }
  return Object.fromEntries(result.data.map((quote) => [quote.assetId, quote]));
}
