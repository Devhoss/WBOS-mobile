import { useCallback, useMemo, useState } from "react";
import { View, Text, ScrollView, RefreshControl } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { useAuthStore } from "@/infrastructure/auth/store";
import { useNetwork } from "@/infrastructure/network/use-network";
import { useTodayTasks, useUpcomingTasks, TaskCard } from "@/features/tasks";
import { GreetingHeader, QuickActionButton } from "@/features/dashboard";
import { SkeletonList, EmptyState, Separator } from "@/design-system";
import type { TaskSummary } from "@/api/tasks/types";

function formatBusinessDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00.000Z");
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).toUpperCase();
}

function groupByBusinessDate(tasks: TaskSummary[]): { label: string; tasks: TaskSummary[] }[] {
  const map = new Map<string, TaskSummary[]>();
  for (const task of tasks) {
    const key = task.businessDate ?? task.dueAt?.slice(0, 10) ?? "upcoming";
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(task);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dateKey, ts]) => {
      const isTomorrow = ts.some((t) => t.bucket === "tomorrow");
      return {
        label: isTomorrow ? "TOMORROW" : formatBusinessDate(dateKey),
        tasks: ts,
      };
    });
}

function UpcomingTaskCard({ task }: { task: TaskSummary }) {
  return (
    <View className="bg-card border border-border/50 rounded-xl overflow-hidden opacity-80">
      <View className="p-4">
        <View className="flex-row items-start">
          <View className="w-10 h-10 rounded-xl items-center justify-center mr-3 bg-muted">
            <Text className="text-xl opacity-60">📦</Text>
          </View>
          <View className="flex-1 min-w-0">
            <Text className="text-base font-semibold text-muted-foreground" numberOfLines={1}>
              {task.title}
            </Text>
            {task.subtitle ? (
              <Text className="text-sm text-muted-foreground/60 mt-0.5" numberOfLines={1}>
                {task.subtitle}
              </Text>
            ) : null}
            <View className="flex-row items-center mt-2 gap-2">
              <View className="px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/30">
                <Text className="text-[10px] font-semibold uppercase tracking-wider text-purple-500">
                  Scheduled
                </Text>
              </View>
              <Text className="text-xs text-muted-foreground/60">
                📍 {task.warehouseName}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { isConnected } = useNetwork();
  const { data: tasks, isLoading, isRefetching, refetch } = useTodayTasks();
  const { data: upcomingTasks, isLoading: upcomingLoading, refetch: refetchUpcoming } = useUpcomingTasks();
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      refetch();
      refetchUpcoming();
    }, [refetch, refetchUpcoming]),
  );

  const upcomingGroups = useMemo(() => groupByBusinessDate(upcomingTasks ?? []), [upcomingTasks]);

  async function handleRefresh() {
    setRefreshing(true);
    await Promise.all([refetch(), refetchUpcoming()]);
    setRefreshing(false);
  }

  function handleTaskPress(task: TaskSummary) {
    if (task.status === "SCHEDULED") return;
    if (task.type === "PICK_ORDER") {
      router.push(`/(app)/picking/${task.id}`);
    } else {
      router.push(`/(app)/tasks/${task.id}`);
    }
  }

  return (
    <ScrollView
      className="flex-1 bg-background"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#3B82F6" />
      }
    >
      {!isConnected ? (
        <View className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-2 mx-4 mt-2">
          <Text className="text-yellow-500 text-sm text-center">
            You're offline — changes will sync when connected
          </Text>
        </View>
      ) : null}

      <View className="px-4 pt-4 pb-2">
        <GreetingHeader
          userName={user?.name ?? "Worker"}
          userRole={user?.role}
          onSettingsPress={() => router.push("/(app)/settings")}
        />
      </View>

      {/* Today's Tasks */}
      <View className="px-4 mb-2">
        <Text className="text-lg font-semibold text-foreground mb-3">Today's Tasks</Text>
      </View>
      <View className="px-4">
        {isLoading ? (
          <SkeletonList count={3} />
        ) : !tasks || tasks.length === 0 ? (
          <EmptyState icon="🎉" title="All caught up!" message="No tasks for today." />
        ) : (
          tasks.map((task) => (
            <View key={task.id} className="mb-3">
              <TaskCard task={task} onPress={handleTaskPress} />
            </View>
          ))
        )}
      </View>

      {/* Upcoming Tasks */}
      {!upcomingLoading && upcomingGroups.length > 0 ? (
        <View className="mt-6 px-4">
          <View className="flex-row items-center mb-3">
            <Text className="text-lg font-semibold text-foreground flex-1">
              Upcoming
            </Text>
            <Text className="text-xs text-muted-foreground">
              Read-only
            </Text>
          </View>
          {upcomingGroups.map((group) => (
            <View key={group.label} className="mb-4">
              <Text className="text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
                {group.label}
              </Text>
              {group.tasks.map((task) => (
                <View key={task.id} className="mb-2">
                  <UpcomingTaskCard task={task} />
                </View>
              ))}
            </View>
          ))}
        </View>
      ) : null}

      {/* Quick Actions */}
      <View className="px-4 pb-6 mt-6">
        <Separator className="mb-4" />

        <QuickActionButton
          icon="📷"
          label="Scan Barcode"
          variant="scan"
          onPress={() => router.push("/(app)/(scanner)")}
        />

        <View className="mt-2">
          <QuickActionButton
            icon="🔍"
            label="Stock Lookup"
            onPress={() => router.push("/(app)/stock/lookup")}
          />
        </View>
      </View>
    </ScrollView>
  );
}
