import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";

// Define schema types locally if inference is complex, or rely on shared schema
// For this simple case, we'll infer from the API response types or just define the shape
// to ensure type safety in components.

export interface SilverPrice {
  id: number;
  priceUsd: string; // decimal returns string
  priceInr: string; // decimal returns string
  conversionRate: string;
  etfPrice: string | null;
  marginX: string;
  timestamp: string; // serialized date
}

export function useSilverPrices() {
  return useQuery({
    queryKey: [api.prices.list.path],
    queryFn: async () => {
      const res = await fetch(api.prices.list.path);
      if (!res.ok) throw new Error("Failed to fetch silver prices");
      const data = await res.json();
      return api.prices.list.responses[200].parse(data);
    },
    refetchInterval: 5000, // Refresh every 5 seconds for near real-time feel
  });
}

export function useLatestPrice() {
  return useQuery({
    queryKey: [api.prices.latest.path],
    queryFn: async () => {
      const res = await fetch(api.prices.latest.path);
      if (!res.ok) throw new Error("Failed to fetch latest price");
      const data = await res.json();
      return api.prices.latest.responses[200].parse(data);
    },
    refetchInterval: 5000, // Refresh every 5 seconds for near real-time feel
  });
}
