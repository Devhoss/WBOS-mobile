import { create } from "zustand";
import { storage, getObject, setObject } from "@/infrastructure/storage/mmkv";
import type { AppSettings } from "./types";
import { defaultSettings } from "./types";

const STORAGE_KEY = "app_settings";

interface SettingsState {
  settings: AppSettings;
  loaded: boolean;
  load: () => void;
  update: (partial: Partial<AppSettings>) => void;
  reset: () => void;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: defaultSettings,
  loaded: false,

  load: () => {
    const stored = getObject<AppSettings>(STORAGE_KEY);
    if (stored) {
      set({ settings: { ...defaultSettings, ...stored }, loaded: true });
    } else {
      set({ loaded: true });
    }
  },

  update: (partial) => {
    const current = get().settings;
    const updated = { ...current, ...partial };
    setObject(STORAGE_KEY, updated);
    set({ settings: updated });
  },

  reset: () => {
    storage.delete(STORAGE_KEY);
    set({ settings: defaultSettings });
  },
}));
