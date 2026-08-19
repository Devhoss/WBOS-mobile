import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { useNotifications } from "@/features/notifications";
import { SafeArea, Header, EmptyState, Toast } from "@/design-system";
import { formatDateTime } from "@/shared/utils/format";
import { notificationRoute } from "@/features/notifications/notification-route";

const typeIcons: Record<string, string> = {
  TASK_ASSIGNED: "📦",
  TASK_SCHEDULED: "📅",
  TASK_AVAILABLE: "⏰",
  TASK_COMPLETED: "✅",
  SHIPMENT_READY: "🚚",
  DELIVERY_COMPLETED: "🏁",
};

export default function NotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    notifications,
    readCount,
    isLoading,
    isRefreshing,
    actionError,
    dismissActionError,
    markAsRead,
    markAllRead,
    clearRead,
    deleteOne,
    refresh,
  } = useNotifications();

  function handleDelete(id: string) {
    Alert.alert("Delete Notification", "Remove this notification?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteOne(id) },
    ]);
  }

  return (
    <SafeArea>
      <Header
        title="Notifications"
        showBack
        rightAction={
          notifications.length > 0 ? (
            <View className="flex-row items-center gap-1 shrink-0">
              {readCount > 0 ? (
                <TouchableOpacity
                  onPress={clearRead}
                  className="shrink-0 px-1 py-2"
                >
                  <Text
                    className="text-xs font-semibold text-muted-foreground"
                    numberOfLines={1}
                  >
                    Clear Read
                  </Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity
                onPress={markAllRead}
                className="shrink-0 px-1 py-2"
              >
                <Text
                  className="text-xs font-semibold text-primary"
                  numberOfLines={1}
                >
                  Mark All Read
                </Text>
              </TouchableOpacity>
            </View>
          ) : undefined
        }
      />
      <ScrollView
        className="flex-1 p-4"
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={refresh} tintColor="#3B82F6" />
        }
      >
        {isLoading ? (
          <View className="flex-1 items-center justify-center py-20">
            <ActivityIndicator size="large" />
          </View>
        ) : notifications.length === 0 ? (
          <EmptyState
            icon="🔔"
            title="No Notifications"
            message="Workflow notifications will appear here."
          />
        ) : (
          notifications.map((n) => (
            <TouchableOpacity
              key={n.id}
              onPress={async () => {
                await markAsRead(n.id);
                const route = notificationRoute({ type: n.type, link: n.link });
                if (route) router.push(route as any);
              }}
              onLongPress={() => handleDelete(n.id)}
              className={`mb-2 rounded-xl border p-4 ${n.isRead ? "border-zinc-800/50 bg-zinc-900/30" : "border-primary/30 bg-primary/5"}`}
            >
              <View className="flex-row items-start gap-3">
                <Text className="text-xl">{typeIcons[n.type] ?? "🔔"}</Text>
                <View className="flex-1 min-w-0">
                  <Text
                    className={`text-sm font-semibold ${n.isRead ? "text-gray-400" : "text-white"}`}
                  >
                    {n.title}
                  </Text>
                  {n.body ? (
                    <Text
                      className={`text-xs mt-0.5 ${n.isRead ? "text-gray-500" : "text-gray-400"}`}
                    >
                      {n.body}
                    </Text>
                  ) : null}
                  <Text className="text-[10px] text-gray-600 mt-1">
                    {formatDateTime(n.createdAt)}
                  </Text>
                </View>
                {!n.isRead ? (
                  <View className="h-2 w-2 rounded-full bg-primary mt-1.5" />
                ) : null}
              </View>
            </TouchableOpacity>
          ))
        )}
        <View style={{ height: insets.bottom + 20 }} />
      </ScrollView>
      <Toast
        message={actionError ?? ""}
        variant="error"
        visible={!!actionError}
        onHide={dismissActionError}
      />
    </SafeArea>
  );
}
