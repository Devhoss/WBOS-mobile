export interface AppSettings {
  hapticsEnabled: boolean;
  scannerSoundEnabled: boolean;
}

export const defaultSettings: AppSettings = {
  hapticsEnabled: true,
  scannerSoundEnabled: true,
};
