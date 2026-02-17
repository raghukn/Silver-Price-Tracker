import { useQuery } from "@tanstack/react-query";
import { Analysis } from "@shared/schema";

export function useAnalysis() {
  return useQuery<Analysis[]>({
    queryKey: ["/api/analysis"],
  });
}
