import { useCallback, useMemo, useState } from "react";
import { View, Text, ScrollView, RefreshControl, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { useAuthStore } from "@/infrastructure/auth/store";
import { useNetwork } from "@/infrastructure/network/use-network";
import { useTodayTasks, useUpcomingTasks, TaskCard } from "@/features/tasks";
import { GreetingHeader, useTodayWork } from "@/features/dashboard";
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

export default function HomeScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { isConnected } = useNetwork();
  const insets = useSafeAreaInsets();
  const { data: tasks, isLoading, isRefetching, refetch, error: tasksError } = useTodayTasks();
  const { data: upcomingTasks, isLoading: upcomingLoading, refetch: refetchUpcoming, error: upcomingError } = useUpcomingTasks();
  const { data: todayWork, error: workError, refetch: refetchWork } = useTodayWork();
  const [refreshing, setRefreshing] = useState(false);
  const [showUpcoming, setShowUpcoming] = useState(false);

  useFocusEffect(
    useCallback(() => {
      refetch();
      refetchUpcoming();
      refetchWork();
    }, [refetch, refetchUpcoming, refetchWork]),
  );

  const upcomingGroups = useMemo(() => groupByBusinessDate(upcomingTasks ?? []), [upcomingTasks]);
  const firstUpcomingTask = useMemo(() => {
    const firstGroup = upcomingGroups[0];
    return firstGroup?.tasks[0] ?? null;
  }, [upcomingGroups]);

  const sortedTasks = useMemo(() => {
    if (!tasks) return [];
    return [...tasks].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [tasks]);

  async function handleRefresh() {
    setRefreshing(true);
    await Promise.all([refetch(), refetchUpcoming(), refetchWork()]);
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
      contentContainerStyle={{ paddingTop: insets.top }}
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
      {tasksError || upcomingError || workError ? (
        <View className="bg-red-500/10 border border-red-500/30 rounded-lg p-2 mx-4 mt-2">
          <Text className="text-red-500 text-sm text-center">
            Failed to load some data. Pull down to retry.
          </Text>
        </View>
      ) : null}

      <View className="px-4 pb-2" style={{ paddingTop: 8 }}>
        <GreetingHeader
          userName={user?.name ?? "Worker"}
          userRole={user?.role}
          onSettingsPress={() => router.push("/(app)/settings")}
        />
      </View>

      {/* Summary strip */}
      {todayWork ? (
        <View className="flex-row px-4 mb-4 gap-2">
          {todayWork.pickOrderCount > 0 ? (
            <View className="flex-row items-center bg-blue-500/10 border border-blue-500/30 rounded-full px-3 py-1.5">
              <Text className="text-xs font-bold text-blue-500">Picks: {todayWork.pickOrderCount}</Text>
            </View>
          ) : null}
          {todayWork.deliveryCount > 0 ? (
            <View className="flex-row items-center bg-green-500/10 border border-green-500/30 rounded-full px-3 py-1.5">
              <Text className="text-xs font-bold text-green-500">Deliveries: {todayWork.deliveryCount}</Text>
            </View>
          ) : null}
          {todayWork.cycleCountCount > 0 ? (
            <View className="flex-row items-center bg-yellow-500/10 border border-yellow-500/30 rounded-full px-3 py-1.5">
              <Text className="text-xs font-bold text-yellow-500">Counts: {todayWork.cycleCountCount}</Text>
            </View>
          ) : null}
        </View>
      ) : null}

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
          sortedTasks.map((task) => (
            <View key={task.id} className="mb-3">
              <TaskCard task={task} onPress={handleTaskPress} />
            </View>
          ))
        )}
      </View>

      {/* Upcoming Tasks — collapsible */}
      {!upcomingLoading && upcomingGroups.length > 0 ? (
        <View className="mt-6 px-4">
          <TouchableOpacity
            onPress={() => setShowUpcoming((p) => !p)}
            className="flex-row items-center"
            activeOpacity={0.7}
          >
            <Text className="text-sm font-semibold text-foreground flex-1">
              Upcoming
            </Text>
            <Text className="text-xs text-muted-foreground mr-1">
              {upcomingGroups.reduce((sum, g) => sum + g.tasks.length, 0)} tasks
            </Text>
            <Text className="text-xs text-muted-foreground">
              {showUpcoming ? "▲" : "▼"}
            </Text>
          </TouchableOpacity>

          {/* Collapsed preview — always visible */}
          {!showUpcoming && firstUpcomingTask ? (
            <View className="mt-1.5">
              <Text className="text-xs text-muted-foreground/70" numberOfLines={1}>
                {upcomingGroups[0]?.label}: {firstUpcomingTask.title}
              </Text>
            </View>
          ) : null}

          {/* Expanded list */}
          {showUpcoming ? (
            <View className="mt-2">
              {upcomingGroups.map((group) => (
                <View key={group.label} className="mb-2">
                  <Text className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                    {group.label}
                  </Text>
                  {group.tasks.map((task) => (
                    <Text key={task.id} className="text-sm text-muted-foreground/80 ml-1 mb-0.5" numberOfLines={1}>
                      {task.title}
                    </Text>
                  ))}
                </View>
              ))}
            </View>
          ) : null}
        </View>
      ) : null}

      {/* Quick Actions — side-by-side */}
      <View className="px-4 pb-6 mt-6">
        <Separator className="mb-4" />
        <View className="flex-row gap-3">
          <TouchableOpacity
            onPress={() => router.push("/(app)/(scanner)")}
            className="flex-1 flex-row items-center justify-center bg-primary/10 border border-primary/30 rounded-xl p-4 min-h-[52px]"
            activeOpacity={0.7}
          >
            <Text className="text-lg mr-2">📷</Text>
            <Text className="text-base font-semibold text-primary">Scan</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push("/(app)/stock/lookup")}
            className="flex-1 flex-row items-center justify-center bg-card border border-border rounded-xl p-4 min-h-[52px]"
            activeOpacity={0.7}
          >
            <Text className="text-lg mr-2">🔍</Text>
            <Text className="text-base font-semibold text-foreground">Lookup</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}
