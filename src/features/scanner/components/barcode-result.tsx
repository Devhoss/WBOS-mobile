import { View, Text } from "react-native";
import { clsx } from "clsx";

interface BarcodeResultProps {
  barcode: string;
  label: string | null;
  type: string | null;
  isLoading: boolean;
  className?: string;
}

export function BarcodeResult({
  barcode,
  label,
  type,
  isLoading,
  className,
}: BarcodeResultProps) {
  if (isLoading) {
    return (
      <View className={clsx("p-4 rounded-lg bg-muted", className)}>
        <Text className="text-muted-foreground">Resolving barcode...</Text>
      </View>
    );
  }

  if (!label) {
    return (
      <View className={clsx("p-4 rounded-lg bg-red-500/10 border border-red-500/30", className)}>
        <Text className="text-red-500 font-medium">Unknown Barcode</Text>
        <Text className="text-foreground mt-1">{barcode}</Text>
      </View>
    );
  }

  return (
    <View className={clsx("p-4 rounded-lg bg-green-500/10 border border-green-500/30", className)}>
      <Text className="text-green-500 font-medium">Found</Text>
      <Text className="text-foreground text-lg font-bold mt-1">{label}</Text>
      {type ? (
        <Text className="text-muted-foreground text-sm mt-0.5 capitalize">{type}</Text>
      ) : null}
    </View>
  );
}
