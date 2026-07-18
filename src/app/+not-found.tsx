import { View, Text, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";

export default function NotFoundScreen() {
  const router = useRouter();

  return (
    <View className="flex-1 items-center justify-center bg-background p-6">
      <Text className="text-6xl mb-4">🔍</Text>
      <Text className="text-2xl font-bold text-foreground mb-2">
        Screen Not Found
      </Text>
      <Text className="text-muted-foreground text-center mb-8">
        The screen you're looking for doesn't exist.
      </Text>
      <TouchableOpacity
        onPress={() => router.replace("/(app)/(home)")}
        className="bg-primary px-6 py-3 rounded-lg min-h-[44px] justify-center"
      >
        <Text className="text-white font-semibold">Go Home</Text>
      </TouchableOpacity>
    </View>
  );
}
