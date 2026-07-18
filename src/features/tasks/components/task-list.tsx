import { FlatList, View, RefreshControl } from "react-native";
import { TaskCard } from "./task-card";
import { SkeletonList } from "@/design-system/components/ui/skeleton";
import { EmptyState } from "@/design-system/components/feedback/empty-state";
import type { TaskSummary } from "@/api/tasks/types";

interface TaskListProps {
  tasks: TaskSummary[] | undefined;
  isLoading: boolean;
  isRefetching: boolean;
  onRefresh: () => void;
  onTaskPress: (task: TaskSummary) => void;
  emptyIcon?: string;
  emptyTitle?: string;
  emptyMessage?: string;
}

export function TaskList({
  tasks,
  isLoading,
  isRefetching,
  onRefresh,
  onTaskPress,
  emptyIcon = "🎉",
  emptyTitle = "All caught up!",
  emptyMessage = "No tasks assigned yet.",
}: TaskListProps) {
  if (isLoading) {
    return <SkeletonList count={4} />;
  }

  if (!tasks || tasks.length === 0) {
    return (
      <EmptyState
        icon={emptyIcon}
        title={emptyTitle}
        message={emptyMessage}
      />
    );
  }

  return (
    <FlatList
      data={tasks}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <View className="mb-3">
          <TaskCard task={item} onPress={onTaskPress} />
        </View>
      )}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={onRefresh}
          tintColor="#3B82F6"
        />
      }
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 24 }}
    />
  );
}
