import type { ExpoConfig } from "@expo/config-types";

const appEnv = process.env.EXPO_PUBLIC_APP_ENV;

export default ({ config }: { config: ExpoConfig }): ExpoConfig => ({
  ...config,
  extra: {
    ...config.extra,
    apiUrl: process.env.EXPO_PUBLIC_API_URL,
    authUrl: process.env.EXPO_PUBLIC_AUTH_URL,
    appEnv,
  },
  android: {
    ...config.android,
    usesCleartextTraffic: appEnv === "development",
  } as Record<string, unknown> as ExpoConfig["android"],
});
