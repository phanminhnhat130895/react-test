import { memo } from "react";
import type { PreparedBalance, Valuation } from "./types";

interface WalletRowProps {
  balance: PreparedBalance;
  status: Valuation["status"];
  formattedUsd: string | undefined;
  asOf: string | undefined;
  pricesPending: boolean;
}

// Stable balance references and primitive price props let unchanged rows skip work.
export const WalletRow = memo(function WalletRow({
  balance, status, formattedUsd, asOf, pricesPending,
}: WalletRowProps) {
  return (
    <tr>
      <th scope="row">
        <span className="currency">{balance.currency}</span>
        <span className="asset-id">{balance.assetId}</span>
      </th>
      <td>{balance.blockchain}</td>
      <td className="numeric amount">{balance.formattedAmount}</td>
      <td className="numeric" title={asOf ? `Quote timestamp: ${asOf}` : undefined}>
        {status === "available" ? formattedUsd : (
          <span className="muted">
            {pricesPending ? "Loading price…" : status === "stale" ? "Price expired" : "Price unavailable"}
          </span>
        )}
      </td>
    </tr>
  );
});
