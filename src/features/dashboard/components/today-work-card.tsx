import { TouchableOpacity, View, Text } from "react-native";
import { clsx } from "clsx";

type WorkType = "pick" | "delivery" | "count";

interface TodayWorkCardProps {
  type: WorkType;
  label: string;
  count: number;
  onPress: () => void;
}

const typeConfig: Record<WorkType, { icon: string; color: string }> = {
  pick: { icon: "📦", color: "bg-blue-500/10 border-blue-500/30" },
  delivery: { icon: "🚚", color: "bg-green-500/10 border-green-500/30" },
  count: { icon: "📋", color: "bg-yellow-500/10 border-yellow-500/30" },
};

export function TodayWorkCard({ type, label, count, onPress }: TodayWorkCardProps) {
  const config = typeConfig[type];

  return (
    <TouchableOpacity
      onPress={onPress}
      className={clsx(
        "flex-row items-center p-4 rounded-xl border mb-3 min-h-[60px]",
        config.color
      )}
      activeOpacity={0.7}
    >
      <Text className="text-2xl mr-4">{config.icon}</Text>
      <View className="flex-1">
        <Text className="text-base font-semibold text-foreground">{label}</Text>
      </View>
      <View className="bg-foreground/10 rounded-full px-3 py-1">
        <Text className="text-foreground font-bold text-lg">{count}</Text>
      </View>
    </TouchableOpacity>
  );
}
