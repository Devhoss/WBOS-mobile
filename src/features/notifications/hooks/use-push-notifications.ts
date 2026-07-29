import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { useAuthStore } from "@/infrastructure/auth/store";
import { registerDeviceToken } from "@/api/device-tokens";
import Constants from "expo-constants";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function getDeviceName(): string | undefined {
  return Constants.deviceName ?? undefined;
}

function getAppVersion(): string | undefined {
  return Constants.expoConfig?.version ?? undefined;
}

export function usePushNotifications() {
  const user = useAuthStore((s) => s.user);
  const status = useAuthStore((s) => s.status);
  const tokenRef = useRef<string | null>(null);

  useEffect(() => {
    if (status !== "authenticated" || !user) return;
    let cancelled = false;

    async function setup() {
      const { status: permStatus } = await Notifications.requestPermissionsAsync();
      if (permStatus !== "granted") return;

      await Notifications.setNotificationChannelAsync("default", {
        name: "Default",
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 100, 50, 100],
        enableVibrate: true,
      });

      try {
        const devicePushToken = await Notifications.getDevicePushTokenAsync();
        if (cancelled) return;
        tokenRef.current = devicePushToken.data;
        await registerDeviceToken(
          devicePushToken.data,
          Platform.OS === "android" ? "ANDROID" : "IOS",
          getDeviceName(),
          getAppVersion(),
        );
      } catch {
        /* token registration is best-effort */
      }
    }

    setup();
    return () => { cancelled = true; };
  }, [status, user]);

  return tokenRef;
}
