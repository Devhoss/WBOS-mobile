import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getPickSession, confirmPickLine, submitPickScanAction } from "@/api/picking";
import type { PickConfirmationRequest, PickScanActionRequest } from "@/api/picking/types";
import type { PickSession } from "@/api/picking/types";
import { optimisticUpdate, optimisticIncrement, optimisticDecrement } from "./pick-optimistic";

export function usePickSession(taskId: string) {
  return useQuery({
    queryKey: ["pick-session", taskId],
    queryFn: () => getPickSession(taskId),
    enabled: !!taskId,
    staleTime: 15 * 1000,
    retry: 2,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "SCHEDULED" ? 15 * 1000 : false;
    },
  });
}

export function useConfirmPickLine(taskId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: PickConfirmationRequest) =>
      confirmPickLine(taskId, data),
    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey: ["pick-session", taskId] });
      const previous = queryClient.getQueryData<PickSession>(["pick-session", taskId]);
      queryClient.setQueryData<PickSession>(
        ["pick-session", taskId],
        (old) => optimisticUpdate(old, data.lineId, data.quantity),
      );
      return { previous };
    },
    onError: (_err, _data, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["pick-session", taskId], context.previous);
      }
    },
    onSettled: (_data, _error, _vars) => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["pick-session", taskId] });
    },
  });
}

export function useSubmitPickScanAction(taskId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: PickScanActionRequest) =>
      submitPickScanAction(taskId, data),
    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey: ["pick-session", taskId] });
      queryClient.setQueryData<PickSession>(
        ["pick-session", taskId],
        (old) => optimisticIncrement(old, data.taskLineId, data.delta),
      );
    },
    onError: (_err, data) => {
      queryClient.setQueryData<PickSession>(
        ["pick-session", taskId],
        (old) => optimisticDecrement(old, data.taskLineId, data.delta),
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["pick-session", taskId] });
    },
  });
}
