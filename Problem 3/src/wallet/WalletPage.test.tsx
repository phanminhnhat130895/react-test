import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { StrictMode } from "react";
import { HttpError } from "../api/http";
import { WalletPage } from "./WalletPage";
import { WalletProvider } from "./WalletProvider";
import { useWalletBalances } from "./hooks/useWalletBalances";
import type { WalletSource } from "./types";

const balance = { id: "eth", assetId: "ethereum:eth", blockchain: "Ethereum", currency: "ETH", amount: "1.25" };
function source(overrides: Partial<WalletSource> = {}): WalletSource {
  return {
    key: "test", label: "Test wallet",
    loadBalances: vi.fn(async () => [balance]),
    loadPrices: vi.fn(async () => [{ assetId: balance.assetId, usd: "2500", asOf: new Date().toISOString() }]),
    ...overrides,
  };
}
function show(dataSource: WalletSource) {
  return render(<StrictMode><WalletProvider source={dataSource}><WalletPage data-testid="wallet"><p>Custom footer</p></WalletPage></WalletProvider></StrictMode>);
}

describe("wallet page", () => {
  it("loads and renders complete rows, native props, and children", async () => {
    show(source());
    expect(screen.getByText("Loading balances…")).toBeInTheDocument();
    expect(await screen.findByText("$3,125.00")).toBeInTheDocument();
    expect(screen.getByText("1.25")).toBeInTheDocument();
    expect(screen.getByText("Custom footer")).toBeInTheDocument();
    expect(screen.getByTestId("wallet")).toHaveAccessibleName("Your wallet");
  });
  it("shows balances before price requests finish", async () => {
    let resolvePrices!: (value: unknown) => void;
    const pending = new Promise<unknown>((resolve) => { resolvePrices = resolve; });
    show(source({ loadPrices: () => pending }));
    expect(await screen.findByText("1.25")).toBeInTheDocument();
    expect(screen.getByText("Loading price…")).toBeInTheDocument();
    await act(async () => resolvePrices([]));
    expect(await screen.findByText("Price unavailable")).toBeInTheDocument();
  });
  it("keeps balances visible if prices fail", async () => {
    show(source({ loadPrices: async () => { throw new HttpError(403); } }));
    expect(await screen.findByText("1.25")).toBeInTheDocument();
    expect(await screen.findByRole("alert")).toHaveTextContent("Price update failed");
    expect(screen.getByText("Price unavailable")).toBeInTheDocument();
    expect(screen.queryByText("$0.00")).not.toBeInTheDocument();
  });
  it("shows an error and recovers with manual refresh", async () => {
    let fail = true;
    show(source({ loadBalances: async () => {
      if (fail) throw new HttpError(403);
      return [balance];
    } }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Balances unavailable");
    fail = false;
    await waitFor(() => expect(screen.getByRole("button", { name: "Refresh" })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "Refresh" }));
    expect(await screen.findByText("1.25")).toBeInTheDocument();
  });
  it("retains previous balances and warns when a later refresh fails", async () => {
    let fail = false;
    show(source({ loadBalances: async () => {
      if (fail) throw new HttpError(403);
      return [balance];
    } }));
    await screen.findByText("1.25");
    fail = true;
    fireEvent.click(screen.getByRole("button", { name: "Refresh" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("showing previously loaded balances");
    expect(screen.getByText("1.25")).toBeInTheDocument();
  });
  it.each([
    { data: [], expected: "No wallet balances found." },
    { data: [{ ...balance, amount: "0" }], expected: "No positive balances on supported networks." },
  ])("distinguishes empty and filtered results", async ({ data, expected }) => {
    show(source({ loadBalances: async () => data }));
    expect(await screen.findByText(expected)).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });
  it("rejects duplicate data instead of rendering unstable duplicate keys", async () => {
    show(source({ loadBalances: async () => [balance, balance] }));
    expect(await screen.findByRole("alert")).toHaveTextContent("duplicate IDs");
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });
  it("paginates and safely clamps the page when the list shrinks", async () => {
    let data = Array.from({ length: 51 }, (_, index) => ({ ...balance, id: String(index).padStart(3, "0") }));
    show(source({ loadBalances: async () => data }));
    await screen.findByText("Page 1 of 2");
    expect(screen.getAllByRole("row")).toHaveLength(51);
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getAllByRole("row")).toHaveLength(2);
    data = [balance];
    fireEvent.click(screen.getByRole("button", { name: "Refresh" }));
    await waitFor(() => expect(screen.queryByRole("navigation")).not.toBeInTheDocument());
    expect(screen.getByText("1.25")).toBeInTheDocument();
  });
});

describe("query lifecycle", () => {
  function Consumer() {
    const result = useWalletBalances();
    return <p>{result.data?.length ?? "pending"}</p>;
  }
  it("shares an in-flight request between consumers and cancels on unmount", async () => {
    let signal: AbortSignal | undefined;
    const loadBalances = vi.fn((requestSignal: AbortSignal) => {
      signal = requestSignal;
      return new Promise<unknown>(() => {});
    });
    const view = render(<WalletProvider source={source({ loadBalances })}><Consumer /><Consumer /></WalletProvider>);
    expect(loadBalances).toHaveBeenCalledTimes(1);
    view.unmount();
    expect(signal?.aborted).toBe(true);
  });
  it("does not let an old source overwrite a new source", async () => {
    let finishOld!: (value: unknown) => void;
    const oldSource = source({ key: "old", loadBalances: () => new Promise((resolve) => { finishOld = resolve; }) });
    const newSource = source({ key: "new", loadBalances: async () => [] });
    const view = render(<WalletProvider source={oldSource}><Consumer /></WalletProvider>);
    view.rerender(<WalletProvider source={newSource}><Consumer /></WalletProvider>);
    expect(await screen.findByText("0")).toBeInTheDocument();
    await act(async () => finishOld([balance]));
    expect(screen.getByText("0")).toBeInTheDocument();
    expect(screen.queryByText("1")).not.toBeInTheDocument();
  });
});
