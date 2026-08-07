import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useFocusEffect } from "expo-router";
import { useCallback, useRef } from "react";
import { AppState } from "react-native";

import { getNotifications, markNotificationRead, markAllNotificationsRead, clearReadNotifications, deleteNotification } from "@/api/notifications";

export function useNotifications() {
  const queryClient = useQueryClient();
  const appStateRef = useRef(AppState.currentState);

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

  const markAsRead = useCallback(async (id: string) => {
    await markNotificationRead(id);
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  }, [queryClient]);

  const markAllRead = useCallback(async () => {
    await markAllNotificationsRead();
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  }, [queryClient]);

  const clearRead = useCallback(async () => {
    await clearReadNotifications();
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  }, [queryClient]);

  const deleteOne = useCallback(async (id: string) => {
    await deleteNotification(id);
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  }, [queryClient]);

  const notifications = query.data?.notifications ?? [];

  return {
    notifications,
    unreadCount: query.data?.unreadCount ?? 0,
    readCount: notifications.filter((n) => n.isRead).length,
    isLoading: query.isLoading,
    markAsRead,
    markAllRead,
    clearRead,
    deleteOne,
    refresh: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  };
}
