import { useQuery } from "@tanstack/react-query";
import { parseBalances } from "../validation";
import { useWalletSource } from "../WalletProvider";

export function useWalletBalances() {
  const source = useWalletSource();
  return useQuery({
    queryKey: ["wallet", source.key, "balances"],
    queryFn: async ({ signal }) => parseBalances(await source.loadBalances(signal)),
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
  });
}
