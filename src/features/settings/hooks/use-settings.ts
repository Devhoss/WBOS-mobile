import { useEffect } from "react";
import { useSettingsStore } from "../store";

/**
 * Selectors, not the whole store. Destructuring the store subscribed every
 * consumer to every change -- including `usePickingScan`, which is live while
 * the camera is running.
 */
export function useSettings() {
  const settings = useSettingsStore((s) => s.settings);
  const loaded = useSettingsStore((s) => s.loaded);
  const load = useSettingsStore((s) => s.load);
  const update = useSettingsStore((s) => s.update);
  const reset = useSettingsStore((s) => s.reset);

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
