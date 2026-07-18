import { View, Text } from "react-native";
import { clsx } from "clsx";

type BadgeVariant = "default" | "success" | "warning" | "destructive" | "info";

interface BadgeProps {
  variant?: BadgeVariant;
  label: string;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-muted text-muted-foreground",
  success: "bg-green-500/20 text-green-500",
  warning: "bg-yellow-500/20 text-yellow-500",
  destructive: "bg-red-500/20 text-red-500",
  info: "bg-blue-500/20 text-blue-500",
};

export function Badge({ variant = "default", label, className }: BadgeProps) {
  return (
    <View
      className={clsx(
        "px-2.5 py-0.5 rounded-full self-start",
        variantStyles[variant].split(" ")[0],
        className
      )}
    >
      <Text
        className={clsx(
          "text-xs font-semibold",
          variantStyles[variant].split(" ")[1]
        )}
      >
        {label}
      </Text>
    </View>
  );
}
