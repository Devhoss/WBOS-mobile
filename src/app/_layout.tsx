import { useEffect } from "react";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import * as Notifications from "expo-notifications";
import { Providers } from "@/core/providers";
import { useAuthStore } from "@/infrastructure/auth/store";
import { getStoredUser, getTokens } from "@/infrastructure/auth/token-storage";
import { unregisterDeviceToken } from "@/api/device-tokens";
import { usePushNotifications } from "@/features/notifications/hooks/use-push-notifications";
import { initSounds } from "@/shared/utils/sound";
import { notificationRoute } from "@/features/notifications/notification-route";
import "./globals.css";

SplashScreen.preventAutoHideAsync();

function useNotificationNavigation() {
  const router = useRouter();

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      const { type, entityType, entityId } = data as Record<string, string | undefined>;

      const route = notificationRoute({ type, entityType, entityId });
      if (route) {
        setTimeout(() => router.push(route as any), 300);
      }
    });

    return () => sub.remove();
  }, [router]);
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({});
  const setUser = useAuthStore((s) => s.setUser);
  const setStatus = useAuthStore((s) => s.setStatus);
  const status = useAuthStore((s) => s.status);

  usePushNotifications();
  useNotificationNavigation();

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

  useEffect(() => {
    if (status === "unauthenticated") {
      const doUnregister = async () => {
        try {
          const tokens = await getTokens();
          if (tokens) {
            const storedUser = await getStoredUser();
            if (storedUser) {
              const devicePushToken = await Notifications.getDevicePushTokenAsync().catch(() => null);
              if (devicePushToken?.data) {
                try {
                  const httpStatus = await unregisterDeviceToken(devicePushToken.data);
                  console.info(`[push] Device token unregistered (HTTP ${httpStatus})`);
                } catch (err) {
                  const axiosErr = err as { response?: { status?: number } };
                  console.warn(
                    `[push] Device token unregister failed${axiosErr.response?.status ? ` (HTTP ${axiosErr.response.status})` : ""}`,
                    err,
                  );
                }
              }
            }
          }
        } catch {
          /* best-effort */
        }
      };
      doUnregister();
    }
  }, [status]);

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
