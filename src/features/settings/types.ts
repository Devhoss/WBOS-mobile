export interface AppSettings {
  theme: "system" | "light" | "dark";
  hapticsEnabled: boolean;
  scannerSoundEnabled: boolean;
  autoConfirmQuantity: boolean;
  defaultWarehouseId: string | null;
}

export const defaultSettings: AppSettings = {
  theme: "system",
  hapticsEnabled: true,
  scannerSoundEnabled: true,
  autoConfirmQuantity: false,
  defaultWarehouseId: null,
};
