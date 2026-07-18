import { View, Text } from "react-native";

interface ScannerOverlayProps {
  isActive: boolean;
  scannedBarcode?: string | null;
}

export function ScannerOverlay({ isActive, scannedBarcode }: ScannerOverlayProps) {
  if (!isActive) return null;

  return (
    <View className="flex-1 items-center justify-center">
      <View className="relative">
        <View className="w-72 h-48 rounded-lg border-2 border-primary/60" />
        <View className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-primary rounded-tl" />
        <View className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-primary rounded-tr" />
        <View className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-primary rounded-bl" />
        <View className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-primary rounded-br" />
      </View>

      {scannedBarcode ? (
        <View className="bg-green-500/20 border border-green-500/40 rounded-lg px-4 py-2 mt-4">
          <Text className="text-green-400 font-mono text-sm">{scannedBarcode}</Text>
        </View>
      ) : (
        <Text className="text-white/60 text-sm mt-4 text-center px-8 leading-5">
          Position barcode within the frame
        </Text>
      )}
    </View>
  );
}
