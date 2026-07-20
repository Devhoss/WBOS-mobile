import { loadProjectEnv, parseProjectEnv } from "@expo/env";
import type { ExpoConfig } from "@expo/config-types";

// ── Environment loading ──────────────────────────────────────
// Expo's getAppConfig.js (run by Gradle every build) calls
// @expo.env.load(projectRoot) first (line 24) which loads .env.*
// based on NODE_ENV, defaulting to "development".  Since @expo/env
// never overrides existing env vars, any EXPO_PUBLIC_* vars we
// set in the shell take precedence.
//
// We then call loadProjectEnv + parseProjectEnv to force-apply
// the mode-specific env file values into process.env.  This
// ensures the correct EXPO_PUBLIC_* vars reach the config.
//
// Priority: EXPO_PUBLIC_APP_ENV (shell) > NODE_ENV > development
const mode =
  process.env.EXPO_PUBLIC_APP_ENV ||
  process.env.NODE_ENV ||
  "development";

loadProjectEnv(process.cwd(), { force: true, silent: true, mode });
const { env } = parseProjectEnv(process.cwd(), { mode });
if (env) {
  for (const [key, value] of Object.entries(env)) {
    if (key.startsWith("EXPO_PUBLIC_") && value) {
      process.env[key] = value;
    }
  }
}

const appEnv = process.env.EXPO_PUBLIC_APP_ENV || mode;

// This log appears in Gradle build output (via getAppConfig.js)
// making it easy to verify which config was loaded.
console.log(
  `[app.config] mode="${mode}" appEnv="${appEnv}" apiUrl="${process.env.EXPO_PUBLIC_API_URL ?? "??"}"`
);

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
