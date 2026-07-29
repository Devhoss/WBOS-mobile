import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useFocusEffect } from "expo-router";
import { useCallback, useRef } from "react";
import { AppState } from "react-native";

import { getNotifications, markNotificationRead, markAllNotificationsRead } from "@/api/notifications";

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

  return {
    notifications: query.data?.notifications ?? [],
    unreadCount: query.data?.unreadCount ?? 0,
    isLoading: query.isLoading,
    markAsRead,
    markAllRead: async () => {
      await markAllNotificationsRead();
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
    refresh: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  };
}
