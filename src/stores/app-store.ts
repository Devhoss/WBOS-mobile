import { create } from "zustand";

interface AppState {
  isReady: boolean;
  isOnline: boolean;
  setReady: (ready: boolean) => void;
  setOnline: (online: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  isReady: false,
  isOnline: true,
  setReady: (isReady) => set({ isReady }),
  setOnline: (isOnline) => set({ isOnline }),
}));
