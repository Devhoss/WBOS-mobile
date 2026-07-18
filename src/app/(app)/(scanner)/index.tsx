import { useState, useCallback, useRef } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { useBarcodeResult, WBOSScanner } from "@/features/scanner";
import * as Haptics from "expo-haptics";

export default function ScannerScreen() {
  const router = useRouter();
  const [barcode, setBarcode] = useState<string | null>(null);
  const [torch, setTorch] = useState(false);
  const lastBarcode = useRef<string | null>(null);

  const { data: resolved, isLoading: resolving } = useBarcodeResult(barcode);

  const handleBarcodeScanned = useCallback((scanned: string) => {
    if (!scanned) return;
    if (scanned === lastBarcode.current) return;
    lastBarcode.current = scanned;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setBarcode(scanned);
  }, []);

  const handleScanAgain = useCallback(() => {
    lastBarcode.current = null;
    setBarcode(null);
  }, []);

  const handleClose = useCallback(() => {
    if (router.canGoBack()) router.back();
  }, [router]);

  const resolvedResult = resolved;
  const showResult = barcode && !resolving;

  return (
    <WBOSScanner
      isActive={!barcode || !!resolving}
      onBarcodeScanned={handleBarcodeScanned}
      onClose={handleClose}
      torch={torch}
      onToggleTorch={() => setTorch((p) => !p)}
    >
      {barcode ? (
        <View style={styles.resultContainer}>
          {resolving ? (
            <Text style={styles.statusText}>Resolving barcode...</Text>
          ) : resolvedResult ? (
            <View style={styles.resolvedBox}>
              <Text style={styles.foundLabel}>
                Found — {resolvedResult.type.replace(/_/g, " ")}
              </Text>
              <Text style={styles.foundName}>{resolvedResult.label}</Text>
              <Text style={styles.foundBarcode}>{resolvedResult.barcode}</Text>
            </View>
          ) : (
            <View style={styles.errorBox}>
              <Text style={styles.errorLabel}>Unknown Barcode</Text>
              <Text style={styles.errorBarcode}>{barcode}</Text>
            </View>
          )}

          <TouchableOpacity
            onPress={handleScanAgain}
            style={styles.scanAgainButton}
            activeOpacity={0.7}
          >
            <Text style={styles.scanAgainText}>Scan Again</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </WBOSScanner>
  );
}

const styles = {
  resultContainer: {
    position: "absolute" as const,
    bottom: 100,
    left: 16,
    right: 16,
    alignItems: "center" as const,
    zIndex: 100,
  },
  statusText: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 14,
    textAlign: "center" as const,
  },
  resolvedBox: {
    backgroundColor: "rgba(34,197,94,0.2)",
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.4)",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignSelf: "stretch" as const,
    marginBottom: 12,
  },
  foundLabel: {
    color: "#4ade80",
    fontSize: 12,
    fontWeight: "700" as const,
  },
  foundName: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700" as const,
    marginTop: 4,
  },
  foundBarcode: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 12,
    marginTop: 4,
    fontFamily: "monospace",
  },
  errorBox: {
    backgroundColor: "rgba(239,68,68,0.2)",
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.4)",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignSelf: "stretch" as const,
    marginBottom: 12,
  },
  errorLabel: {
    color: "#f87171",
    fontSize: 12,
    fontWeight: "700" as const,
  },
  errorBarcode: {
    color: "#fff",
    fontSize: 14,
    marginTop: 4,
    fontFamily: "monospace",
  },
  scanAgainButton: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
    minHeight: 44,
    justifyContent: "center" as const,
  },
  scanAgainText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600" as const,
  },
};
