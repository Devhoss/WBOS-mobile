import { ActivityIndicator, View, Text } from "react-native";
import { clsx } from "clsx";

interface LoadingProps {
  size?: "small" | "large";
  message?: string;
  fullScreen?: boolean;
  className?: string;
}

export function Loading({
  size = "large",
  message,
  fullScreen = false,
  className,
}: LoadingProps) {
  const content = (
    <View className={clsx("items-center justify-center", className)}>
      <ActivityIndicator size={size} className="text-primary" />
      {message ? (
        <Text className="text-muted-foreground text-sm mt-3">{message}</Text>
      ) : null}
    </View>
  );

  if (fullScreen) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        {content}
      </View>
    );
  }

  return content;
}
