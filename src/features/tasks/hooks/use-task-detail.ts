import { useQuery } from "@tanstack/react-query";
import { getTaskDetail } from "@/api/tasks";

export function useTaskDetail(id: string) {
  return useQuery({
    queryKey: ["tasks", id],
    queryFn: () => getTaskDetail(id),
    enabled: !!id,
    staleTime: 30 * 1000,
    retry: 2,
  });
}
