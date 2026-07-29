import { View, Text, TouchableOpacity } from "react-native";

interface GreetingHeaderProps {
  userName: string;
  userRole?: string;
  unreadCount?: number;
  onSettingsPress?: () => void;
  onNotificationsPress?: () => void;
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

export function GreetingHeader({ userName, userRole, unreadCount, onSettingsPress, onNotificationsPress }: GreetingHeaderProps) {
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
        {onNotificationsPress ? (
          <TouchableOpacity
            onPress={onNotificationsPress}
            className="size-9 rounded-full bg-muted items-center justify-center relative"
          >
            <Text className="text-base">🔔</Text>
            {unreadCount ? (
              <View className="absolute -top-0.5 -right-0.5 h-4 min-w-[16px] rounded-full bg-red-500 items-center justify-center px-1">
                <Text className="text-[9px] font-bold text-white">{unreadCount > 9 ? "9+" : unreadCount}</Text>
              </View>
            ) : null}
          </TouchableOpacity>
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
