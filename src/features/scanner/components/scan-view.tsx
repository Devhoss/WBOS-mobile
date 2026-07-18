import { useEffect, useRef } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Animated } from "react-native";
import { CameraView, type BarcodeType } from "expo-camera";
import type { ScannerStatus } from "../types";
import { defaultScannerConfig } from "../types";

interface ScanViewProps {
  isActive: boolean;
  status: ScannerStatus;
  torchEnabled: boolean;
  onBarcodeScanned: (data: string) => void;
  onToggleTorch: () => void;
  onCancel: () => void;
  barcodeTypes?: BarcodeType[];
}

const STATUS_LABELS: Record<ScannerStatus, string | null> = {
  idle: null,
  scanning: "Position barcode within the frame",
  processing: "Processing...",
  success: null,
  error: "Try again",
};

function ScanFrame() {
  const scanLineAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(scanLineAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [scanLineAnim]);

  const scanLineTranslateY = scanLineAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-80, 80],
  });

  return (
    <View style={styles.frameContainer}>
      <View style={styles.frame}>
        {/* Corner brackets */}
        <View style={[styles.corner, styles.cornerTopLeft]} />
        <View style={[styles.corner, styles.cornerTopRight]} />
        <View style={[styles.corner, styles.cornerBottomLeft]} />
        <View style={[styles.corner, styles.cornerBottomRight]} />

        {/* Animated scan line */}
        <Animated.View
          style={[
            styles.scanLine,
            { transform: [{ translateY: scanLineTranslateY }] },
          ]}
        />
      </View>
    </View>
  );
}

export function ScanView({
  isActive,
  status,
  torchEnabled,
  onBarcodeScanned,
  onToggleTorch,
  onCancel,
  barcodeTypes = defaultScannerConfig.barcodeTypes as BarcodeType[],
}: ScanViewProps) {
  if (!isActive) return null;

  return (
    <View style={styles.container}>
      {/* Darkened overlay with scan frame */}
      <View style={styles.overlay}>
        <ScanFrame />
        <Text style={styles.hintText}>
          {STATUS_LABELS[status] ?? "Position barcode within the frame"}
        </Text>
      </View>

      {/* Bottom controls */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          onPress={onCancel}
          style={styles.btn}
          activeOpacity={0.7}
        >
          <Text style={styles.btnText}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onToggleTorch}
          style={[styles.btn, torchEnabled && styles.btnActive]}
          activeOpacity={0.7}
        >
          <Text style={[styles.btnText, torchEnabled && styles.btnTextActive]}>
            {torchEnabled ? "Torch On" : "Torch Off"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* CameraView rendered LAST to be on top of SurfaceView native layer */}
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        enableTorch={torchEnabled}
        barcodeScannerSettings={{ barcodeTypes }}
        onBarcodeScanned={(result) => {
          onBarcodeScanned(result.data);
        }}
      />
    </View>
  );
}

const FRAME_SIZE = 260;
const CORNER_SIZE = 24;
const CORNER_THICKNESS = 3;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 50,
  },
  frameContainer: {
    width: FRAME_SIZE,
    height: FRAME_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  frame: {
    width: FRAME_SIZE,
    height: FRAME_SIZE,
    position: "relative",
  },
  corner: {
    position: "absolute",
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderColor: "#22c55e",
  },
  cornerTopLeft: {
    top: 0,
    left: 0,
    borderTopWidth: CORNER_THICKNESS,
    borderLeftWidth: CORNER_THICKNESS,
  },
  cornerTopRight: {
    top: 0,
    right: 0,
    borderTopWidth: CORNER_THICKNESS,
    borderRightWidth: CORNER_THICKNESS,
  },
  cornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: CORNER_THICKNESS,
    borderLeftWidth: CORNER_THICKNESS,
  },
  cornerBottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: CORNER_THICKNESS,
    borderRightWidth: CORNER_THICKNESS,
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
    color: "rgba(255,255,255,0.7)",
    fontSize: 14,
    marginTop: 24,
    textAlign: "center",
  },
  bottomBar: {
    position: "absolute",
    bottom: 32,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    zIndex: 50,
  },
  btn: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    minHeight: 44,
    justifyContent: "center",
  },
  btnActive: {
    backgroundColor: "#eab308",
  },
  btnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  btnTextActive: {
    color: "#000",
    fontSize: 14,
    fontWeight: "600",
  },
});
