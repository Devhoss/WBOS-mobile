export const APP_NAME = "WBOS Mobile";

export const STORAGE_KEYS = {
  SETTINGS: "app_settings",
  AUTH_TOKENS: "auth_tokens",
  AUTH_USER: "auth_user",
  QUERY_CACHE: "query_cache",
  OFFLINE_QUEUE: "offline_queue",
} as const;

export const QUERY_CONFIG = {
  defaultStaleTime: 60 * 1000,
  defaultCacheTime: 5 * 60 * 1000,
  retryCount: 2,
  offlineStaleTime: 30 * 60 * 1000,
} as const;

export const SCANNER_CONFIG = {
  scanDelayMs: 500,
  enableVibration: true,
  enableSound: true,
  enableTorch: false,
} as const;

export const PAGINATION = {
  defaultPageSize: 20,
  maxPageSize: 100,
} as const;
