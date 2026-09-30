import { useId, useMemo, useState, type ComponentPropsWithoutRef } from "react";
import { describeError } from "../api/http";
import { useWalletBalances } from "./hooks/useWalletBalances";
import { usePrices } from "./hooks/usePrices";
import { useNow } from "./hooks/useNow";
import { prepareBalances, valueBalance } from "./selectors";
import { useWalletSource } from "./WalletProvider";
import { WalletRow } from "./WalletRow";
import type { WalletBalance } from "./types";

type Props = ComponentPropsWithoutRef<"section">;
const EMPTY_BALANCES: readonly WalletBalance[] = [];
const PAGE_SIZE = 50;

export function WalletPage({ children, className = "", ...rest }: Props) {
  const source = useWalletSource();
  const balances = useWalletBalances();
  const prices = usePrices();
  const now = useNow();
  const titleId = useId();
  const [requestedPage, setPage] = useState(0);
  const data = balances.data ?? EMPTY_BALANCES;
  const prepared = useMemo(() => prepareBalances(data), [data]);
  const pageCount = Math.max(1, Math.ceil(prepared.length / PAGE_SIZE));
  const page = Math.min(requestedPage, pageCount - 1);
  const visible = prepared.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const refreshing = balances.isFetching || prices.isFetching;
  const excluded = data.length - prepared.length;

  function refresh() {
    void balances.refetch();
    void prices.refetch();
  }

  return (
    <section {...rest} className={`wallet ${className}`} aria-labelledby={titleId}>
      <header className="wallet-header">
        <div>
          <p className="eyebrow">{source.label}</p>
          <h1 id={titleId}>Your wallet</h1>
          <p className="muted">Positive balances on supported networks. Estimated values in USD.</p>
        </div>
        <button type="button" onClick={refresh} disabled={refreshing}>
          {refreshing ? "Refreshing…" : "Refresh"}
        </button>
      </header>

      {(balances.fetchStatus === "paused" || prices.fetchStatus === "paused") && (
        <p role="status" className="notice">You appear to be offline. Updates will resume when connected.</p>
      )}
      {balances.error && (
        <p role="alert" className="notice">
          {balances.data ? "Balance refresh failed; showing previously loaded balances. " : "Balances unavailable. "}
          {describeError(balances.error)} Use Refresh to retry.
        </p>
      )}
      {prices.error && (
        <p role="alert" className="notice">
          Price update failed. {describeError(prices.error)} Balances remain available.
          {prices.data ? " Previously loaded quotes are used only until they expire." : ""} Use Refresh to retry.
        </p>
      )}
      {balances.isPending && <p role="status">Loading balances…</p>}

      {balances.data && prepared.length === 0 && (
        <p role="status">
          {data.length === 0 ? "No wallet balances found." : "No positive balances on supported networks."}
        </p>
      )}

      {prepared.length > 0 && (
        <>
          <div className="table-scroll" role="region" aria-label="Wallet balances" tabIndex={0}>
            <table>
              <caption>
                {prepared.length} eligible {prepared.length === 1 ? "balance" : "balances"}
                {balances.dataUpdatedAt > 0 && (
                  <> · Loaded <time dateTime={new Date(balances.dataUpdatedAt).toISOString()}>
                    {new Date(balances.dataUpdatedAt).toLocaleTimeString()}
                  </time></>
                )}
              </caption>
              <thead><tr><th scope="col">Asset</th><th scope="col">Network</th><th scope="col" className="numeric">Amount</th><th scope="col" className="numeric">USD value</th></tr></thead>
              <tbody>
                {visible.map((balance) => {
                  // Use current wall time at render, including when a background tab resumes.
                  const value = valueBalance(balance, prices.data, Math.max(now, Date.now()));
                  return <WalletRow
                    key={balance.id}
                    balance={balance}
                    status={value.status}
                    formattedUsd={value.status === "available" ? value.formatted : undefined}
                    asOf={value.status === "available" ? value.asOf : undefined}
                    pricesPending={prices.isPending}
                  />;
                })}
              </tbody>
            </table>
          </div>
          {pageCount > 1 && (
            <nav className="pagination" aria-label="Balance pages">
              <button type="button" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</button>
              <span role="status">Page {page + 1} of {pageCount}</span>
              <button type="button" disabled={page === pageCount - 1} onClick={() => setPage(page + 1)}>Next</button>
            </nav>
          )}
        </>
      )}
      {excluded > 0 && <p className="footnote">{excluded} balances excluded: zero or negative amounts, or unsupported networks.</p>}
      <p className="footnote">Quotes older than 2 minutes are marked expired. Small positive values below one cent are shown as &lt;$0.01.</p>
      {children}
    </section>
  );
}
