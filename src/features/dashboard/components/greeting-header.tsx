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
    <View className="flex-row items-start justify-between mb-6 mt-6">
      <View className="flex-1">
        <Text className="text-3xl font-bold text-foreground">{greeting}</Text>
        <Text className="text-lg font-semibold text-foreground mt-1">
          {firstName}
        </Text>
        {userRole ? (
          <Text className="text-sm text-muted-foreground mt-0.5">
            {formatRole(userRole)}
          </Text>
        ) : null}
      </View>
      {onSettingsPress ? (
        <TouchableOpacity
          onPress={onSettingsPress}
          className="size-10 rounded-full bg-muted items-center justify-center"
        >
          <Text className="text-lg">⚙️</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}
