import { View, Text } from "react-native";
import { clsx } from "clsx";
import type { StockItemDisplay } from "../types";

interface StockItemProps {
  item: StockItemDisplay;
  className?: string;
}

export function StockItem({ item, className }: StockItemProps) {
  const available = item.quantityAvailable;
  const isLow = available <= 5;

  return (
    <View className={clsx("p-4 rounded-lg bg-card border border-border", className)}>
      <Text className="text-base font-semibold text-foreground">{item.name}</Text>
      <Text className="text-sm text-muted-foreground mt-0.5">{item.sku}</Text>
      {item.binLocation ? (
        <Text className="text-sm text-muted-foreground mt-0.5">
          Location: {item.binLocation}
        </Text>
      ) : null}

      <View className="flex-row items-center mt-3 gap-4">
        <View>
          <Text className="text-xs text-muted-foreground">On Hand</Text>
          <Text className="text-lg font-bold text-foreground">{item.quantityOnHand}</Text>
        </View>
        <View>
          <Text className="text-xs text-muted-foreground">Available</Text>
          <Text
            className={clsx(
              "text-lg font-bold",
              isLow ? "text-destructive" : "text-foreground"
            )}
          >
            {available}
          </Text>
        </View>
      </View>
      <Text className="text-xs text-muted-foreground mt-1">{item.unitOfMeasure}</Text>
    </View>
  );
}
