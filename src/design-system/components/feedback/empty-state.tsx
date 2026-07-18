import { View, Text } from "react-native";

interface EmptyStateProps {
  icon: string;
  title: string;
  message: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, title, message, action }: EmptyStateProps) {
  return (
    <View className="flex-1 items-center justify-center px-6 py-12">
      <Text className="text-5xl mb-4">{icon}</Text>
      <Text className="text-xl font-bold text-foreground text-center mb-2">
        {title}
      </Text>
      <Text className="text-muted-foreground text-center text-base mb-6">
        {message}
      </Text>
      {action}
    </View>
  );
}
