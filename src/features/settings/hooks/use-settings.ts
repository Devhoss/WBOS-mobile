import { useEffect } from "react";
import { useSettingsStore } from "../store";

export function useSettings() {
  const { settings, loaded, load, update, reset } = useSettingsStore();

  useEffect(() => {
    if (!loaded) load();
  }, [loaded, load]);

  return {
    settings,
    loaded,
    updateSettings: update,
    resetSettings: reset,
  };
}
