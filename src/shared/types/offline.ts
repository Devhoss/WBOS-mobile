export type SyncStatus = "pending" | "syncing" | "completed" | "failed";

export interface SyncQueueItem {
  id: string;
  type: string;
  endpoint: string;
  method: "POST" | "PATCH" | "PUT" | "DELETE";
  body: unknown;
  createdAt: string;
  status: SyncStatus;
  retryCount: number;
  lastError: string | null;
}

export interface SyncState {
  queue: SyncQueueItem[];
  isSyncing: boolean;
  lastSyncAt: string | null;
}

export interface OfflineCapable {
  supportsOffline: boolean;
  syncStrategy: "optimistic" | "pessimistic" | "manual";
  ttl: number;
}
