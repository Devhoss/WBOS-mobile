import { View, Text, Switch, TouchableOpacity } from "react-native";
import { clsx } from "clsx";

interface SettingsRowProps {
  label: string;
  description?: string;
  type: "toggle" | "navigation" | "action";
  value?: boolean;
  onToggle?: (value: boolean) => void;
  onPress?: () => void;
  destructive?: boolean;
  className?: string;
}

export function SettingsRow({
  label,
  description,
  type,
  value,
  onToggle,
  onPress,
  destructive = false,
  className,
}: SettingsRowProps) {
  const content = (
    <View
      className={clsx(
        "flex-row items-center py-3 min-h-[44px]",
        className
      )}
    >
      <View className="flex-1">
        <Text
          className={clsx(
            "text-base",
            destructive ? "text-destructive" : "text-foreground"
          )}
        >
          {label}
        </Text>
        {description ? (
          <Text className="text-sm text-muted-foreground mt-0.5">
            {description}
          </Text>
        ) : null}
      </View>
      {type === "toggle" ? (
        <Switch
          value={value}
          onValueChange={onToggle}
          className="ml-2"
        />
      ) : (
        <Text className="text-muted-foreground text-lg ml-2">›</Text>
      )}
    </View>
  );

  if (type === "action" || type === "navigation") {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}
