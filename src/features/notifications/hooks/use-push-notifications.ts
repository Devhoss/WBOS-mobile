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

/**
 * Push setup is chatty by nature, and the detail it prints — user id, device
 * name, token prefix — is diagnostic only. Gated so none of it reaches a
 * production log, and kept at `log` level so it cannot raise LogBox over the UI.
 */
function pushLog(message: string) {
  if (__DEV__) {
    console.log(`[push] ${message}`);
  }
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
      pushLog(`Permission status: ${permStatus}`);
      if (permStatus !== "granted") {
        pushLog("Notification permission not granted — push disabled");
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
        pushLog(`Retrieved device push token ${maskToken(token)} (${platform})`);
        pushLog(
          `Registering device token (user=${currentUserId}, platform=${platform}, device=${getDeviceName() ?? "unknown"}, appVersion=${getAppVersion() ?? "unknown"})`,
        );

        try {
          const httpStatus = await registerDeviceToken(token, platform, getDeviceName(), getAppVersion());
          pushLog(`Device token registered successfully (HTTP ${httpStatus})`);
        } catch (err) {
          const axiosErr = err as { response?: { status?: number } };
          const status = axiosErr.response?.status;
          if (status === 401) {
            pushLog("Device token registration rejected (session expired) — handled by sign-in flow");
            return;
          }
          console.error(
            `[push] Device token registration FAILED${status ? ` (HTTP ${status})` : ""}`,
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
