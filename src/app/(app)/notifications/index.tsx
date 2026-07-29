import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { useNotifications } from "@/features/notifications";
import { SafeArea, Header, EmptyState } from "@/design-system";
import { formatDateTime } from "@/shared/utils/format";

const typeIcons: Record<string, string> = {
  TASK_ASSIGNED: "📋",
  SHIPMENT_READY: "🚚",
  DELIVERY_COMPLETED: "✅",
  TASK_COMPLETED: "✅",
};

export default function NotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { notifications, isLoading, markAsRead, markAllRead } = useNotifications();

  return (
    <SafeArea>
      <Header
        title="Notifications"
        showBack
        rightAction={notifications.length > 0 ? (
          <TouchableOpacity onPress={markAllRead}>
            <Text className="text-xs font-semibold text-primary">Read All</Text>
          </TouchableOpacity>
        ) : undefined}
      />
      <ScrollView className="flex-1 p-4">
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
                if (n.link) {
                  router.push(`/(app)/picking/${n.link}` as any);
                }
              }}
              className={`mb-2 rounded-xl border p-4 ${n.isRead ? "border-zinc-800/50 bg-zinc-900/30" : "border-primary/30 bg-primary/5"}`}
            >
              <View className="flex-row items-start gap-3">
                <Text className="text-xl">{typeIcons[n.type] ?? "🔔"}</Text>
                <View className="flex-1 min-w-0">
                  <Text className={`text-sm font-semibold ${n.isRead ? "text-gray-400" : "text-white"}`}>
                    {n.title}
                  </Text>
                  {n.body ? (
                    <Text className={`text-xs mt-0.5 ${n.isRead ? "text-gray-500" : "text-gray-400"}`}>
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
    </SafeArea>
  );
}
