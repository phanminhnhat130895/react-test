import { createContext, useContext, useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { shouldRetry } from "../api/http";
import type { WalletSource } from "./types";

const SourceContext = createContext<WalletSource | null>(null);

export function WalletProvider({ source, children }: { source: WalletSource; children: ReactNode }) {
  const [client] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        retry: shouldRetry,
        retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 5000),
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
      },
    },
  }));

  return (
    <QueryClientProvider client={client}>
      <SourceContext.Provider value={source}>{children}</SourceContext.Provider>
    </QueryClientProvider>
  );
}

export function useWalletSource(): WalletSource {
  const source = useContext(SourceContext);
  if (!source) throw new Error("Wallet hooks require WalletProvider.");
  return source;
}
