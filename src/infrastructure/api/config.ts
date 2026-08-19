import Constants from "expo-constants";

export type AppEnvironment = "development" | "homelab" | "production";

export interface ApiConfig {
  baseUrl: string;
  authUrl: string;
  apiVersion: string;
  environment: AppEnvironment;
  timeout: number;
}

function requireConfig(key: string): string {
  const value = Constants.expoConfig?.extra?.[key] as string | undefined;
  if (!value) {
    throw new Error(
      `Missing required configuration: "${key}". ` +
        `Ensure "${key}" is defined in app.json's extra section and ` +
        `the corresponding EXPO_PUBLIC_${key.replace(/([A-Z])/g, "_$1").toUpperCase()} environment variable is set.`
    );
  }
  return value;
}

function getEnvironment(): AppEnvironment {
  const env = Constants.expoConfig?.extra?.appEnv as string | undefined;
  if (env === "homelab" || env === "production") return env;
  return "development";
}

function getApiUrl(): string {
  return requireConfig("apiUrl");
}

function getAuthUrl(): string {
  return requireConfig("authUrl");
}

export const apiConfig: ApiConfig = {
  baseUrl: getApiUrl(),
  authUrl: getAuthUrl(),
  apiVersion: "v1",
  environment: getEnvironment(),
  timeout: 15000,
};

/**
 * A release build must not be pointed at a development backend.
 *
 * Which `.env.<mode>` file supplies these URLs is decided by `EXPO_PUBLIC_APP_ENV`
 * or `NODE_ENV` at Gradle time, and nothing binds a build variant to an
 * environment — so a release APK built in the wrong shell would quietly talk to
 * the development LAN address over plain HTTP. Release builds no longer permit
 * cleartext, so that combination would fail at the first request with an
 * opaque network error. Failing here instead says why.
 */
function assertEnvironmentIsShippable(config: ApiConfig): void {
  if (__DEV__) return;

  const problems: string[] = [];
  if (!config.baseUrl.startsWith("https://")) {
    problems.push(`API URL is not HTTPS (${new URL(config.baseUrl).protocol}//…)`);
  }
  if (!config.authUrl.startsWith("https://")) {
    problems.push(`Auth URL is not HTTPS (${new URL(config.authUrl).protocol}//…)`);
  }
  if (config.environment === "development") {
    problems.push('app environment is "development"');
  }

  if (problems.length > 0) {
    throw new Error(
      `This build is configured for development and cannot run as a release: ${problems.join("; ")}. ` +
        "Rebuild with EXPO_PUBLIC_APP_ENV=production (or homelab).",
    );
  }
}

assertEnvironmentIsShippable(apiConfig);

export function apiUrl(path: string): string {
  const base = apiConfig.baseUrl.replace(/\/+$/, "");
  const cleanPath = path.replace(/^\/+/, "");
  return `${base}/api/${apiConfig.apiVersion}/${cleanPath}`;
}

export function authUrl(path: string): string {
  const base = apiConfig.authUrl.replace(/\/+$/, "");
  const cleanPath = path.replace(/^\/+/, "");
  return `${base}/api/auth/${cleanPath}`;
}

if (__DEV__) {
  console.log(
    `[Config] Environment: ${apiConfig.environment} | ` +
    `API: ${apiConfig.baseUrl}/api/${apiConfig.apiVersion} | ` +
    `Auth: ${apiConfig.authUrl}/api/${apiConfig.apiVersion}`
  );
}
