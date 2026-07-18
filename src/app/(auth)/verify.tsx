import { View, Text } from "react-native";
import { SafeArea } from "@/design-system";

export default function VerifyScreen() {
  return (
    <SafeArea>
      <View className="flex-1 justify-center px-6">
        <Text className="text-2xl font-bold text-foreground text-center">
          Verify Your Account
        </Text>
        <Text className="text-muted-foreground text-center mt-3">
          Check your email for a verification link.
        </Text>
      </View>
    </SafeArea>
  );
}
