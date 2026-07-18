import { View, Text, TouchableOpacity } from "react-native";
import { clsx } from "clsx";
import { useRouter } from "expo-router";

interface HeaderProps {
  title: string;
  showBack?: boolean;
  rightAction?: React.ReactNode;
  className?: string;
}

export function Header({
  title,
  showBack = false,
  rightAction,
  className,
}: HeaderProps) {
  const router = useRouter();

  return (
    <View
      className={clsx(
        "flex-row items-center px-4 py-3 bg-background border-b border-border",
        className
      )}
    >
      {showBack ? (
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-[44px] h-[44px] items-center justify-center -ml-2"
        >
          <Text className="text-foreground text-xl">←</Text>
        </TouchableOpacity>
      ) : (
        <View className="w-[44px]" />
      )}

      <Text
        className="flex-1 text-lg font-semibold text-foreground text-center"
        numberOfLines={1}
      >
        {title}
      </Text>

      {rightAction ? (
        <View className="w-[44px] items-center">{rightAction}</View>
      ) : (
        <View className="w-[44px]" />
      )}
    </View>
  );
}
