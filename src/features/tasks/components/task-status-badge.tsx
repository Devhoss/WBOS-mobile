import { View, Text } from "react-native";
import { clsx } from "clsx";
import { taskStatusColors } from "../types";
import type { TaskStatus } from "@/api/tasks/types";

interface TaskStatusBadgeProps {
  status: TaskStatus;
}

export function TaskStatusBadge({ status }: TaskStatusBadgeProps) {
  const colors = taskStatusColors[status] ?? taskStatusColors.assigned;
  const [bg, text] = colors.split(" ");

  return (
    <View className={clsx("px-2.5 py-0.5 rounded-full self-start", bg)}>
      <Text className={clsx("text-xs font-medium", text)}>
        {status.replace("_", " ")}
      </Text>
    </View>
  );
}
