import { useQuery } from "@tanstack/react-query";
import { getTodayWork } from "@/api/warehouses";

export function useTodayWork() {
  return useQuery({
    queryKey: ["today-work"],
    queryFn: getTodayWork,
    staleTime: 60 * 1000,
    retry: 2,
  });
}
