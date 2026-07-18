import { TouchableOpacity, View, Text } from "react-native";
import { clsx } from "clsx";
import type { TaskSummary } from "@/api/tasks/types";
import { taskTypeConfig, taskStatusColors, taskPriorityBadges } from "../types";

interface TaskCardProps {
  task: TaskSummary;
  onPress: (task: TaskSummary) => void;
}

export function TaskCard({ task, onPress }: TaskCardProps) {
  const typeInfo = taskTypeConfig[task.type] ?? { icon: "📋", label: "Task" };
  const statusColors = taskStatusColors[task.status];
  const priorityBadge = taskPriorityBadges[task.priority];

  const isCompleted = task.status === "COMPLETED";
  const isCancelled = task.status === "CANCELLED";
  const isInProgress = task.status === "IN_PROGRESS";

  return (
    <TouchableOpacity
      onPress={() => onPress(task)}
      className={clsx(
        "bg-card border rounded-xl active:opacity-80 overflow-hidden",
        isCompleted ? "border-green-500/20" :
        isCancelled ? "border-border/50" :
        isInProgress ? "border-primary/30" :
        "border-border"
      )}
      activeOpacity={0.7}
    >
      {/* Priority color bar */}
      {task.priority === "URGENT" || task.priority === "HIGH" ? (
        <View className={clsx(
          "h-1",
          task.priority === "URGENT" ? "bg-destructive" : "bg-yellow-500"
        )} />
      ) : null}

      <View className="p-4">
        <View className="flex-row items-start">
          <View className={clsx(
            "w-10 h-10 rounded-xl items-center justify-center mr-3",
            isCompleted ? "bg-green-500/20" :
            isCancelled ? "bg-muted" :
            "bg-primary/10"
          )}>
            <Text className={clsx(
              "text-xl",
              isCancelled && "opacity-40"
            )}>
              {typeInfo.icon}
            </Text>
          </View>

          <View className="flex-1 min-w-0">
            <View className="flex-row items-center gap-2">
              <Text
                className={clsx(
                  "text-base font-semibold flex-1",
                  isCompleted ? "text-green-500" :
                  isCancelled ? "text-muted-foreground" :
                  "text-foreground"
                )}
                numberOfLines={1}
              >
                {task.title}
              </Text>
              <View className={clsx(
                "px-2 py-0.5 rounded-full border",
                isCompleted ? "bg-green-500/10 border-green-500/30" :
                isCancelled ? "bg-muted border-border" :
                statusColors
              )}>
                <Text className={clsx(
                  "text-[10px] font-semibold uppercase tracking-wider",
                  isCompleted ? "text-green-500" :
                  isCancelled ? "text-muted-foreground" :
                  "text-foreground"
                )}>
                  {task.status === "IN_PROGRESS" ? "Active" :
                   task.status === "ASSIGNED" ? "Ready" :
                   task.status === "SCHEDULED" ? "Scheduled" :
                   task.status.replace("_", " ")}
                </Text>
              </View>
            </View>

            {task.subtitle ? (
              <Text
                className={clsx(
                  "text-sm mt-0.5",
                  isCancelled ? "text-muted-foreground/60" : "text-muted-foreground"
                )}
                numberOfLines={1}
              >
                {task.subtitle}
              </Text>
            ) : null}

            <View className="flex-row items-center mt-2 gap-3">
              {priorityBadge ? (
                <View className={clsx(
                  "px-2 py-0.5 rounded",
                  priorityBadge.bg
                )}>
                  <Text className={clsx(
                    "text-[10px] font-bold uppercase tracking-wider",
                    priorityBadge.text
                  )}>
                    {priorityBadge.label}
                  </Text>
                </View>
              ) : null}
              <Text className="text-xs text-muted-foreground">
                📍 {task.warehouseName}
              </Text>
            </View>
          </View>

          <Text className="text-muted-foreground text-lg ml-2 mt-1">›</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}
