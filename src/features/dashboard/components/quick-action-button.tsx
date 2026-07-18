import { TouchableOpacity, Text } from "react-native";
import { clsx } from "clsx";

interface QuickActionButtonProps {
  icon: string;
  label: string;
  onPress: () => void;
  variant?: "default" | "scan";
}

export function QuickActionButton({
  icon,
  label,
  onPress,
  variant = "default",
}: QuickActionButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className={clsx(
        "flex-row items-center p-4 rounded-xl border min-h-[52px]",
        variant === "scan"
          ? "bg-primary/10 border-primary/30"
          : "bg-card border-border"
      )}
      activeOpacity={0.7}
    >
      <Text className="text-xl mr-3">{icon}</Text>
      <Text
        className={clsx(
          "text-base font-semibold",
          variant === "scan" ? "text-primary" : "text-foreground"
        )}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}
