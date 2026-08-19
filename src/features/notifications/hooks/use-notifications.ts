import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { AppState } from "react-native";

import { toUserMessage } from "@/shared/errors/user-message";
import { getNotifications, markNotificationRead, markAllNotificationsRead, clearReadNotifications, deleteNotification } from "@/api/notifications";

export function useNotifications() {
  const queryClient = useQueryClient();
  const appStateRef = useRef(AppState.currentState);
  const [actionError, setActionError] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ["notifications"],
    queryFn: getNotifications,
    refetchInterval: 2 * 60 * 1000,
    staleTime: 30 * 1000,
  });

  useFocusEffect(
    useCallback(() => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    }, [queryClient]),
  );

  useFocusEffect(
    useCallback(() => {
      const sub = AppState.addEventListener("change", (nextState) => {
        if (appStateRef.current.match(/inactive|background/) && nextState === "active") {
          queryClient.invalidateQueries({ queryKey: ["notifications"] });
        }
        appStateRef.current = nextState;
      });
      return () => sub.remove();
    }, [queryClient]),
  );

  /**
   * Each of these was a bare `await` called from an `onPress` that did not
   * await it, so a failure became an unhandled rejection and the row simply
   * did not change. They now report, and the list is only invalidated once the
   * server has actually accepted the change.
   */
  const run = useCallback(
    async (action: () => Promise<void>, fallback: string): Promise<boolean> => {
      try {
        await action();
        queryClient.invalidateQueries({ queryKey: ["notifications"] });
        return true;
      } catch (err) {
        setActionError(toUserMessage(err, fallback));
        return false;
      }
    },
    [queryClient],
  );

  const markAsRead = useCallback(
    (id: string) => run(() => markNotificationRead(id), "Could not mark that as read."),
    [run],
  );

  const markAllRead = useCallback(
    () => run(markAllNotificationsRead, "Could not mark these as read."),
    [run],
  );

  const clearRead = useCallback(
    () => run(clearReadNotifications, "Could not clear read notifications."),
    [run],
  );

  const deleteOne = useCallback(
    (id: string) => run(() => deleteNotification(id), "Could not delete that notification."),
    [run],
  );

  const notifications = query.data?.notifications ?? [];

  return {
    notifications,
    unreadCount: query.data?.unreadCount ?? 0,
    readCount: notifications.filter((n) => n.isRead).length,
    isLoading: query.isLoading,
    isRefreshing: query.isFetching && !query.isLoading,
    actionError,
    dismissActionError: () => setActionError(null),
    markAsRead,
    markAllRead,
    clearRead,
    deleteOne,
    refresh: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  };
}
