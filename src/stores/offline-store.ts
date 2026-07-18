import { create } from "zustand";
import type { SyncQueueItem, SyncState } from "@/shared/types/offline";

interface OfflineState extends SyncState {
  addToQueue: (item: Omit<SyncQueueItem, "id" | "createdAt" | "status" | "retryCount" | "lastError">) => void;
  removeFromQueue: (id: string) => void;
  setSyncing: (syncing: boolean) => void;
  markCompleted: (id: string) => void;
  markFailed: (id: string, error: string) => void;
  clearQueue: () => void;
}

export const useOfflineStore = create<OfflineState>((set) => ({
  queue: [],
  isSyncing: false,
  lastSyncAt: null,

  addToQueue: (item) => {
    const newItem: SyncQueueItem = {
      ...item,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      status: "pending",
      retryCount: 0,
      lastError: null,
    };
    set((state) => ({ queue: [...state.queue, newItem] }));
  },

  removeFromQueue: (id) => {
    set((state) => ({ queue: state.queue.filter((i) => i.id !== id) }));
  },

  setSyncing: (isSyncing) => set({ isSyncing }),

  markCompleted: (id) => {
    set((state) => ({
      queue: state.queue.map((i) =>
        i.id === id ? { ...i, status: "completed" as const } : i
      ),
    }));
  },

  markFailed: (id, error) => {
    set((state) => ({
      queue: state.queue.map((i) =>
        i.id === id
          ? {
              ...i,
              status: "failed" as const,
              retryCount: i.retryCount + 1,
              lastError: error,
            }
          : i
      ),
    }));
  },

  clearQueue: () => set({ queue: [] }),
}));
