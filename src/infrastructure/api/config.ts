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
