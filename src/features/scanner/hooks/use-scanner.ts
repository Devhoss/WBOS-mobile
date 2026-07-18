import { useState, useCallback, useRef } from "react";
import type { ScannerStatus, ScannerConfig } from "../types";
import { defaultScannerConfig } from "../types";

export interface UseScannerReturn {
  status: ScannerStatus;
  lastScanned: string | null;
  error: string | null;
  torchEnabled: boolean;
  startScanning: () => void;
  stopScanning: () => void;
  toggleTorch: () => void;
  handleScan: (barcode: string) => void;
  reset: () => void;
}

export function useScanner(
  config: Partial<ScannerConfig> = {},
): UseScannerReturn {
  const merged: ScannerConfig = { ...defaultScannerConfig, ...config };
  const lastScanTime = useRef(0);
  const [status, setStatus] = useState<ScannerStatus>("idle");
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [torchEnabled, setTorchEnabled] = useState(false);

  const startScanning = useCallback(() => {
    setStatus("scanning");
    setLastScanned(null);
    setError(null);
  }, []);

  const stopScanning = useCallback(() => {
    setStatus("idle");
    setLastScanned(null);
    setError(null);
    setTorchEnabled(false);
  }, []);

  const toggleTorch = useCallback(() => {
    setTorchEnabled((prev) => !prev);
  }, []);

  const handleScan = useCallback(
    (barcode: string) => {
      const now = Date.now();
      if (now - lastScanTime.current < merged.debounceMs) return;
      lastScanTime.current = now;

      setLastScanned(barcode);
      setError(null);
      setStatus("processing");
    },
    [merged.debounceMs],
  );

  const reset = useCallback(() => {
    setStatus("idle");
    setLastScanned(null);
    setError(null);
    setTorchEnabled(false);
    lastScanTime.current = 0;
  }, []);

  return {
    status,
    lastScanned,
    error,
    torchEnabled,
    startScanning,
    stopScanning,
    toggleTorch,
    handleScan,
    reset,
  };
}
