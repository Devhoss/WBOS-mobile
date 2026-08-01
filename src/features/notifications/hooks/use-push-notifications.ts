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

function maskToken(token: string): string {
  if (token.length <= 12) return `${token.length} chars`;
  return `${token.slice(0, 8)}...${token.slice(-4)} (${token.length} chars)`;
}

export function usePushNotifications() {
  const user = useAuthStore((s) => s.user);
  const status = useAuthStore((s) => s.status);
  const tokenRef = useRef<string | null>(null);

  useEffect(() => {
    if (status !== "authenticated" || !user) return;
    const currentUserId = user.id;
    let cancelled = false;

    async function setup() {
      const { status: permStatus } = await Notifications.requestPermissionsAsync();
      console.info(`[push] Permission status: ${permStatus}`);
      if (permStatus !== "granted") {
        console.warn("[push] Notification permission not granted — push disabled");
        return;
      }

      try {
        await Notifications.setNotificationChannelAsync("default", {
          name: "Default",
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 100, 50, 100],
          enableVibrate: true,
        });
      } catch (err) {
        console.warn("[push] Failed to configure Android notification channel:", err);
      }

      try {
        const devicePushToken = await Notifications.getDevicePushTokenAsync();
        if (cancelled) return;
        const token = devicePushToken.data;
        tokenRef.current = token;

        const platform = Platform.OS === "android" ? "ANDROID" : "IOS";
        console.info(`[push] Retrieved device push token ${maskToken(token)} (${platform})`);
        console.info(
          `[push] Registering device token (user=${currentUserId}, platform=${platform}, device=${getDeviceName() ?? "unknown"}, appVersion=${getAppVersion() ?? "unknown"})`,
        );

        try {
          const httpStatus = await registerDeviceToken(token, platform, getDeviceName(), getAppVersion());
          console.info(`[push] Device token registered successfully (HTTP ${httpStatus})`);
        } catch (err) {
          const axiosErr = err as { response?: { status?: number } };
          console.error(
            `[push] Device token registration FAILED${axiosErr.response?.status ? ` (HTTP ${axiosErr.response.status})` : ""}`,
            err,
          );
        }
      } catch (err) {
        console.error("[push] Failed to retrieve device push token:", err);
      }
    }

    setup();
    return () => {
      cancelled = true;
    };
  }, [status, user]);

  return tokenRef;
}
