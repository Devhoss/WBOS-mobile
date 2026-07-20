import { useRef, useEffect, useCallback, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Linking,
} from "react-native";
import { Camera, useCameraDevice, useCameraPermission } from "react-native-vision-camera";
import { useBarcodeScannerOutput, type TargetBarcodeFormat } from "react-native-vision-camera-barcode-scanner";
import type { BarcodeObservation } from "../hooks/use-barcode-presence";

export type ScannerMode = "lookup" | "picking" | "receiving" | "inventory";

const SUPPORTED_FORMATS: TargetBarcodeFormat[] = [
  "ean-13", "ean-8", "upc-a", "upc-e",
  "code-128", "code-39", "code-93", "itf",
];

function toBarcodeObservation(barcode: {
  rawValue: string | undefined;
}): BarcodeObservation | null {
  if (!barcode.rawValue) return null;
  return { value: barcode.rawValue };
}

interface WBOSScannerProps {
  isActive: boolean;
  onBarcodeScanned?: (barcode: string) => void;
  onBarcodeFrame?: (barcodes: BarcodeObservation[]) => void;
  onClose?: () => void;
  torch?: boolean;
  onToggleTorch?: () => void;
  overlay?: React.ReactNode;
  barcodeFormats?: TargetBarcodeFormat[];
  children?: React.ReactNode;
}

export function WBOSScanner({
  isActive,
  onBarcodeScanned,
  onBarcodeFrame,
  onClose,
  torch = false,
  onToggleTorch,
  overlay,
  barcodeFormats = SUPPORTED_FORMATS,
  children,
}: WBOSScannerProps) {
  const device = useCameraDevice("back");
  const { hasPermission, requestPermission } = useCameraPermission();
  const [permDenied, setPermDenied] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const permRequested = useRef(false);
  const onBarcodeScannedRef = useRef(onBarcodeScanned);
  onBarcodeScannedRef.current = onBarcodeScanned;
  const onBarcodeFrameRef = useRef(onBarcodeFrame);
  onBarcodeFrameRef.current = onBarcodeFrame;

  useEffect(() => {
    if (!isActive) {
      setCameraReady(false);
    }
  }, [isActive]);

  useEffect(() => {
    if (hasPermission) return;
    if (permDenied) return;
    if (permRequested.current) return;

    permRequested.current = true;
    requestPermission().then((granted) => {
      if (!granted) setPermDenied(true);
    });
  }, [hasPermission, permDenied, requestPermission]);

  const scanLineAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (overlay) return;
    if (!isActive) return;
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(scanLineAnim, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [scanLineAnim, isActive, overlay]);

  const handleBarcodeScanned = useCallback(
    (barcodes: Array<{
      rawValue: string | undefined;
    }>) => {
      const vals = barcodes
        .map(toBarcodeObservation)
        .filter((v): v is BarcodeObservation => !!v);

      onBarcodeFrameRef.current?.(vals);

      for (const barcode of vals) {
        onBarcodeScannedRef.current?.(barcode.value);
      }
    },
    [],
  );

  const scannerOutput = useBarcodeScannerOutput({
    barcodeFormats,
    onBarcodeScanned: handleBarcodeScanned,
    onError: (error) => {
      console.error("Barcode scanner error:", error);
    },
  });

  const scanLineTranslateY = scanLineAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 180],
  });

  if (!device) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.statusText}>No camera available</Text>
        </View>
      </View>
    );
  }

  if (!hasPermission) {
    if (permDenied) {
      return (
        <View style={styles.container}>
          <View style={styles.centerContent}>
            <Text style={styles.deniedIcon}>📷</Text>
            <Text style={styles.deniedTitle}>Camera Access Denied</Text>
            <Text style={styles.deniedText}>
              Camera access has been denied.{'\n'}
              Grant it below or enable it in Settings.
            </Text>
            <TouchableOpacity
              onPress={() => {
                requestPermission().then((granted) => {
                  if (granted) {
                    setPermDenied(false);
                    permRequested.current = true;
                  }
                });
              }}
              style={styles.primaryButton}
              activeOpacity={0.7}
            >
              <Text style={styles.primaryButtonText}>Try Again</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => Linking.openSettings()}
              style={[styles.primaryButton, { marginTop: 12 }]}
              activeOpacity={0.7}
            >
              <Text style={styles.primaryButtonText}>Open Settings</Text>
            </TouchableOpacity>
            {onClose ? (
              <TouchableOpacity
                onPress={onClose}
                style={styles.secondaryButton}
                activeOpacity={0.7}
              >
                <Text style={styles.secondaryButtonText}>Go Back</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      );
    }

    return <View style={styles.container} />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.overlay} pointerEvents="box-none">
        {overlay ?? (
          <View style={styles.defaultOverlay} pointerEvents="box-none">
            <View style={styles.frameContainer}>
              <View style={styles.frame}>
                <View style={[styles.corner, styles.cornerTopLeft]} />
                <View style={[styles.corner, styles.cornerTopRight]} />
                <View style={[styles.corner, styles.cornerBottomLeft]} />
                <View style={[styles.corner, styles.cornerBottomRight]} />
                <Animated.View
                  style={[
                    styles.scanLine,
                    { transform: [{ translateY: scanLineTranslateY }] },
                  ]}
                />
              </View>
            </View>
            <Text style={styles.hintText}>
              Position barcode within the frame
            </Text>
          </View>
        )}

        {children}
      </View>

      {onClose ? (
        <TouchableOpacity
          onPress={onClose}
          style={styles.closeButton}
          activeOpacity={0.7}
        >
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>
      ) : null}

      {onToggleTorch && cameraReady && isActive ? (
        <TouchableOpacity
          onPress={onToggleTorch}
          style={[styles.torchButton, torch && styles.torchButtonActive]}
          activeOpacity={0.7}
        >
          <Text style={torch ? styles.torchTextActive : styles.torchText}>
            🔦 Flash
          </Text>
        </TouchableOpacity>
      ) : null}

      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={isActive}
        outputs={[scannerOutput]}
        onStarted={() => setCameraReady(true)}
        onStopped={() => setCameraReady(false)}
        torchMode={cameraReady ? (torch ? "on" : "off") : undefined}
        enableNativeTapToFocusGesture={cameraReady}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  centerContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    backgroundColor: "#000",
  },
  statusText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 14,
  },
  deniedIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  deniedTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
  },
  deniedText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  primaryButton: {
    backgroundColor: "#fff",
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    minHeight: 48,
    justifyContent: "center",
  },
  primaryButtonText: {
    color: "#000",
    fontSize: 16,
    fontWeight: "700",
  },
  secondaryButton: {
    marginTop: 12,
    paddingHorizontal: 24,
    paddingVertical: 10,
    minHeight: 44,
    justifyContent: "center",
  },
  secondaryButtonText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 14,
    fontWeight: "600",
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 50,
  },
  defaultOverlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  frameContainer: {
    width: 260,
    height: 200,
    alignItems: "center",
    justifyContent: "center",
  },
  frame: {
    width: 260,
    height: 200,
    position: "relative",
    overflow: "hidden",
  },
  corner: {
    position: "absolute",
    width: 24,
    height: 24,
    borderColor: "#22c55e",
  },
  cornerTopLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
  },
  cornerTopRight: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
  },
  cornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
  },
  cornerBottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
  },
  scanLine: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: "#22c55e",
    opacity: 0.8,
  },
  hintText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 14,
    marginTop: 24,
    textAlign: "center",
  },
  closeButton: {
    position: "absolute",
    top: 60,
    left: 16,
    zIndex: 100,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  closeText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "600",
  },
  torchButton: {
    position: "absolute",
    bottom: 40,
    right: 24,
    zIndex: 100,
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    minHeight: 44,
    justifyContent: "center",
  },
  torchButtonActive: {
    backgroundColor: "#eab308",
  },
  torchText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  torchTextActive: {
    color: "#000",
    fontSize: 14,
    fontWeight: "600",
  },
});
