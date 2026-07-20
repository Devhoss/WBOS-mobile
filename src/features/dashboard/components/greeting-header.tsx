import { View, Text, TouchableOpacity } from "react-native";

interface GreetingHeaderProps {
  userName: string;
  userRole?: string;
  onSettingsPress?: () => void;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
}

function formatRole(role: string): string {
  return role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function GreetingHeader({ userName, userRole, onSettingsPress }: GreetingHeaderProps) {
  const greeting = getGreeting();
  const firstName = userName.split(" ")[0];

  return (
    <View className="flex-row items-center justify-between mb-3">
      <Text className="text-xl font-bold text-foreground">
        {greeting}, {firstName}
      </Text>
      <View className="flex-row items-center gap-2">
        {userRole ? (
          <Text className="text-xs text-muted-foreground">{formatRole(userRole)}</Text>
        ) : null}
        {onSettingsPress ? (
          <TouchableOpacity
            onPress={onSettingsPress}
            className="size-9 rounded-full bg-muted items-center justify-center"
          >
            <Text className="text-base">⚙️</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}
