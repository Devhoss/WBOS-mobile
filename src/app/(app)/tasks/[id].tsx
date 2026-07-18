import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useTaskDetail, useStartTask, useCompleteTask, TaskStatusBadge, taskTypeConfig, taskPriorityBadges } from "@/features/tasks";
import { SafeArea, Header, Card, Separator, Loading, Badge } from "@/design-system";
import { formatDateTime } from "@/shared/utils/format";
import { playSuccessSound } from "@/shared/utils/sound";
import type { TaskStatus } from "@/api/tasks/types";

export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: task, isLoading } = useTaskDetail(id);
  const startMutation = useStartTask();
  const completeMutation = useCompleteTask();

  if (isLoading) {
    return (
      <SafeArea>
        <Header title="Task Details" showBack />
        <Loading fullScreen message="Loading task..." />
      </SafeArea>
    );
  }

  if (!task) {
    return (
      <SafeArea>
        <Header title="Task Details" showBack />
        <View className="flex-1 items-center justify-center p-6">
          <Text className="text-4xl mb-4">🔍</Text>
          <Text className="text-lg font-semibold text-foreground mb-2">
            Task Not Found
          </Text>
          <Text className="text-muted-foreground text-center">
            This task may have been removed.
          </Text>
        </View>
      </SafeArea>
    );
  }

  const t = task;
  const typeInfo = taskTypeConfig[t.type] ?? { icon: "📋", label: "Task" };
  const priorityBadge = taskPriorityBadges[t.priority];
  const isStarted = t.status !== "ASSIGNED";
  const isCompleted = t.status === "COMPLETED" || t.status === "CANCELLED";
  const totalLines = t.lines?.length ?? 0;
  const completedLines = t.lines?.filter((l) => l.status === "COMPLETED" || l.completedQuantity > 0).length ?? 0;
  const progressPercent = totalLines > 0 ? Math.round((completedLines / totalLines) * 100) : 0;

  async function handleStart() {
    await startMutation.mutateAsync({ id: t.id, updatedAt: t.updatedAt });
  }

  async function handleComplete() {
    await completeMutation.mutateAsync({ id: t.id, updatedAt: t.updatedAt });
    playSuccessSound();
  }

  return (
    <SafeArea>
      <Header title={typeInfo.label} showBack />
      <ScrollView className="flex-1 p-4">
        {/* Header card */}
        <Card className="mb-4">
          <View className="flex-row items-start gap-3">
            <View className="w-12 h-12 rounded-xl bg-primary/10 items-center justify-center">
              <Text className="text-2xl">{typeInfo.icon}</Text>
            </View>
            <View className="flex-1 min-w-0">
              <Text className="text-xl font-bold text-foreground" numberOfLines={2}>
                {t.title}
              </Text>
              {t.subtitle ? (
                <Text className="text-muted-foreground text-sm mt-1" numberOfLines={1}>
                  {t.subtitle}
                </Text>
              ) : null}
              <View className="flex-row items-center mt-2 gap-2">
                <TaskStatusBadge status={t.status as TaskStatus} />
                {priorityBadge ? (
                  <View className={`px-2 py-0.5 rounded ${priorityBadge.bg}`}>
                    <Text className={`text-[10px] font-bold uppercase tracking-wider ${priorityBadge.text}`}>
                      {priorityBadge.label}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>
            <Text className="text-2xl font-bold text-foreground">{progressPercent}%</Text>
          </View>
        </Card>

        {/* Details card */}
        <Card className="mb-4">
          <Text className="text-sm font-semibold text-foreground mb-3">
            Details
          </Text>
          <DetailRow label="Warehouse" value={t.warehouseName} />
          <Separator className="my-2" />
          <DetailRow label="Created" value={formatDateTime(t.createdAt)} />
          {t.startedAt ? (
            <>
              <Separator className="my-2" />
              <DetailRow label="Started" value={formatDateTime(t.startedAt)} />
            </>
          ) : null}
          {t.completedAt ? (
            <>
              <Separator className="my-2" />
              <DetailRow label="Completed" value={formatDateTime(t.completedAt)} />
            </>
          ) : null}
        </Card>

        {/* Progress card */}
        {totalLines > 0 ? (
          <Card className="mb-4">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-sm font-semibold text-foreground">Lines</Text>
              <Text className="text-sm text-muted-foreground">{completedLines}/{totalLines}</Text>
            </View>
            <View className="h-2 bg-muted rounded-full overflow-hidden">
              <View
                className="h-full bg-primary rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </View>
          </Card>
        ) : null}

        {/* Lines */}
        {t.lines && t.lines.length > 0 ? (
          <Card padded={false} className="mb-4">
            {t.lines.map((line, idx) => {
              const isLineDone = line.status === "COMPLETED" || line.completedQuantity > 0;
              return (
                <View key={line.id}>
                  {idx > 0 ? <Separator /> : null}
                  <View className="px-4 py-3">
                    <View className="flex-row items-center">
                      <View className={`w-8 h-8 rounded-lg items-center justify-center mr-3 ${isLineDone ? "bg-green-500" : "bg-muted"}`}>
                        <Text className={`text-sm font-bold ${isLineDone ? "text-white" : "text-muted-foreground"}`}>
                          {line.sortOrder}
                        </Text>
                      </View>
                      <View className="flex-1 min-w-0">
                        <Text className={`text-base font-semibold ${isLineDone ? "text-green-500" : "text-foreground"}`} numberOfLines={1}>
                          {line.productName}
                        </Text>
                        <View className="flex-row items-center mt-0.5 gap-2">
                          <Text className="text-sm text-muted-foreground">{line.productSku}</Text>
                          {line.binLocation ? (
                            <Text className="text-xs text-muted-foreground">📍 {line.binLocation}</Text>
                          ) : null}
                        </View>
                      </View>
                      <View className="items-end ml-2">
                        <Text className={`text-lg font-bold ${isLineDone ? "text-green-500" : "text-foreground"}`}>
                          {line.completedQuantity}
                          <Text className="text-base font-normal text-muted-foreground">/{line.quantityOrdered}</Text>
                        </Text>
                        {isLineDone ? (
                          <Badge variant="success" label="Done" />
                        ) : null}
                      </View>
                    </View>
                  </View>
                </View>
              );
            })}
          </Card>
        ) : null}

        {/* Actions */}
        <View className="flex-row gap-3 mt-2 pb-8">
          {!isStarted ? (
            <TouchableOpacity
              onPress={handleStart}
              disabled={startMutation.isPending}
              className="flex-1 bg-primary py-4 rounded-lg items-center min-h-[52px] justify-center"
            >
              <Text className="text-white font-bold text-lg">
                {startMutation.isPending ? "Starting..." : "Start Task"}
              </Text>
            </TouchableOpacity>
          ) : null}

          {isStarted && !isCompleted ? (
            <TouchableOpacity
              onPress={handleComplete}
              disabled={completeMutation.isPending}
              className="flex-1 bg-green-600 py-4 rounded-lg items-center min-h-[52px] justify-center"
            >
              <Text className="text-white font-bold text-lg">
                {completeMutation.isPending ? "Completing..." : "Complete Task"}
              </Text>
            </TouchableOpacity>
          ) : null}

          {isCompleted ? (
            <TouchableOpacity
              onPress={() => router.back()}
              className="flex-1 bg-secondary py-4 rounded-lg items-center min-h-[52px] justify-center"
            >
              <Text className="text-secondary-foreground font-bold text-lg">
                Go Back
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </ScrollView>
    </SafeArea>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between">
      <Text className="text-sm text-muted-foreground">{label}</Text>
      <Text className="text-sm text-foreground font-medium">{value}</Text>
    </View>
  );
}
