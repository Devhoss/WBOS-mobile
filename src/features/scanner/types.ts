export interface BarcodeEvent {
  barcode: string;
  timestamp: number;
}

export type ScannerStatus = "idle" | "scanning" | "processing" | "success" | "error";

export interface ScannerState {
  status: ScannerStatus;
  lastScanned: BarcodeEvent | null;
  error: string | null;
}

export interface ScannerCallbacks {
  onBarcodeScanned: (barcode: string) => void;
  onError: (error: string) => void;
}

export interface ScannerConfig {
  debounceMs: number;
  enableTorch: boolean;
  barcodeTypes: string[];
}

export const defaultScannerConfig: ScannerConfig = {
  debounceMs: 500,
  enableTorch: false,
  barcodeTypes: [
    "ean13", "ean8", "upc_a", "upc_e",
    "code128", "code39", "code93",
    "itf14",
  ],
};
