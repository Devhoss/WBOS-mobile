import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getTodayTasks, getScheduledTasks, startTask, completeTask } from "@/api/tasks";

export function useTodayTasks() {
  return useQuery({
    queryKey: ["tasks", "today"],
    queryFn: getTodayTasks,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
    retry: 2,
  });
}

export function useUpcomingTasks() {
  return useQuery({
    queryKey: ["tasks", "scheduled"],
    queryFn: getScheduledTasks,
    staleTime: 60 * 1000,
    refetchInterval: 120 * 1000,
    retry: 2,
  });
}

export function useStartTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updatedAt }: { id: string; updatedAt: string }) => startTask(id, updatedAt),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["pick-session", variables.id] });
    },
  });
}

export function useCompleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updatedAt }: { id: string; updatedAt: string }) => completeTask(id, updatedAt),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["pick-session", variables.id] });
    },
  });
}
