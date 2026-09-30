import { useQuery } from "@tanstack/react-query";
import { parsePrices } from "../validation";
import { useWalletSource } from "../WalletProvider";

export function usePrices() {
  const source = useWalletSource();
  return useQuery({
    queryKey: ["wallet", source.key, "prices"],
    queryFn: async ({ signal }) => parsePrices(await source.loadPrices(signal)),
    staleTime: 15_000,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  });
}
