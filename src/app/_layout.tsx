import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { Providers } from "@/core/providers";
import { useAuthStore } from "@/infrastructure/auth/store";
import { getStoredUser, getTokens } from "@/infrastructure/auth/token-storage";
import { initSounds } from "@/shared/utils/sound";
import "./globals.css";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({});
  const setUser = useAuthStore((s) => s.setUser);
  const setStatus = useAuthStore((s) => s.setStatus);

  useEffect(() => {
    async function bootstrap() {
      try {
        const tokens = await getTokens();
        if (tokens) {
          const user = await getStoredUser();
          if (user) {
            setUser(user);
          } else {
            setStatus("unauthenticated");
          }
        } else {
          setStatus("unauthenticated");
        }
      } catch {
        setStatus("unauthenticated");
      } finally {
        await SplashScreen.hideAsync();
      }
    }

    bootstrap();
    initSounds();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <Providers>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(app)" />
        <Stack.Screen name="+not-found" />
      </Stack>
    </Providers>
  );
}
