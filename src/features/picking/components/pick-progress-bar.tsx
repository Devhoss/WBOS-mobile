import { View, Text } from "react-native";
import { clsx } from "clsx";

interface PickProgressBarProps {
  picked: number;
  total: number;
}

export function PickProgressBar({ picked, total }: PickProgressBarProps) {
  const progress = total > 0 ? picked / total : 0;
  const percent = Math.round(progress * 100);

  return (
    <View className="mb-4">
      <View className="flex-row items-center justify-between mb-2">
        <Text className="text-sm font-semibold text-foreground">Progress</Text>
        <View className="flex-row items-center gap-2">
          <Text
            className={clsx(
              "text-sm font-bold",
              percent === 100 ? "text-green-500" : "text-foreground"
            )}
          >
            {percent}%
          </Text>
          <Text className="text-sm text-muted-foreground">
            ({picked}/{total} lines)
          </Text>
        </View>
      </View>
      <View className="h-3 bg-muted rounded-full overflow-hidden">
        <View
          className={clsx(
            "h-full rounded-full",
            percent === 100 ? "bg-green-500" : "bg-primary"
          )}
          style={{ width: `${percent}%` }}
        />
      </View>
      {/* Segmented dots showing each line */}
      {total > 1 ? (
        <View className="flex-row gap-1 mt-1.5">
          {Array.from({ length: total }, (_, i) => (
            <View
              key={i}
              className={clsx(
                "flex-1 h-1 rounded-full",
                i < picked ? "bg-green-500" : "bg-muted"
              )}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}
