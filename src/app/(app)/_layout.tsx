import { useEffect } from "react";
import { Stack, useRouter } from "expo-router";
import { useAuthStore } from "@/infrastructure/auth/store";
import { FullScreenLoading } from "@/design-system";

export default function AppLayout() {
  const router = useRouter();
  const status = useAuthStore((s) => s.status);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/(auth)/sign-in");
    }
  }, [status, router]);

  if (status !== "authenticated") {
    return <FullScreenLoading />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(home)" />
      <Stack.Screen name="(scanner)" />
      <Stack.Screen name="tasks/[id]" />
      <Stack.Screen name="picking/[id]" />
      <Stack.Screen name="audio-test" />
      <Stack.Screen name="stock/lookup" />
      <Stack.Screen name="settings/index" />
    </Stack>
  );
}
