import { View, ActivityIndicator, Text } from "react-native";

interface FullScreenLoadingProps {
  message?: string;
}

export function FullScreenLoading({ message }: FullScreenLoadingProps) {
  return (
    <View className="flex-1 items-center justify-center bg-background">
      <ActivityIndicator size="large" className="text-primary" />
      {message ? (
        <Text className="text-muted-foreground text-sm mt-4">{message}</Text>
      ) : null}
    </View>
  );
}
