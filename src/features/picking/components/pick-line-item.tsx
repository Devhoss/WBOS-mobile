import { TouchableOpacity, View, Text } from "react-native";
import { clsx } from "clsx";
import type { PickLineDetail } from "@/api/picking/types";

interface PickLineItemProps {
  line: PickLineDetail;
  onPick: (line: PickLineDetail) => void;
  isActive?: boolean;
}

export function PickLineItem({ line, onPick, isActive }: PickLineItemProps) {
  const isPicked = line.status === "picked";
  const progress =
    line.quantityOrdered > 0
      ? Math.min(line.quantityPicked / line.quantityOrdered, 1)
      : 0;
  const percent = Math.round(progress * 100);

  return (
    <TouchableOpacity
      onPress={() => onPick(line)}
      disabled={isPicked}
      className={clsx(
        "bg-card border rounded-xl min-h-[72px] overflow-hidden",
        isPicked ? "border-green-500/30 bg-green-500/5" : "border-border",
        isActive ? "border-primary ring-1 ring-primary" : "",
      )}
      activeOpacity={0.7}
    >
      {/* Picked progress bar at top */}
      {isPicked ? (
        <View className="h-1 bg-green-500" />
      ) : percent > 0 ? (
        <View className="h-1 bg-muted">
          <View
            className="h-full bg-primary rounded-r"
            style={{ width: `${percent}%` }}
          />
        </View>
      ) : null}

      <View className="p-4">
        <View className="flex-row items-center">
          {/* Line number badge */}
          <View
            className={clsx(
              "w-10 h-10 rounded-xl items-center justify-center mr-3",
              isPicked ? "bg-green-500" : "bg-muted",
            )}
          >
            <Text
              className={clsx(
                "text-base font-bold",
                isPicked ? "text-white" : "text-muted-foreground",
              )}
            >
              {line.lineNumber}
            </Text>
          </View>

          <View className="flex-1 min-w-0">
            <Text
              className={clsx(
                "text-base font-semibold",
                isPicked ? "text-green-500" : "text-foreground",
              )}
              numberOfLines={1}
            >
              {line.productName}
            </Text>
            <Text className="text-sm text-muted-foreground mt-0.5">
              {line.productSku}
            </Text>

            <View className="flex-row items-center mt-1.5 gap-3">
              {line.binLocation ? (
                <View className="flex-row items-center">
                  <Text className="text-xs text-muted-foreground">
                    📍 {line.binLocation}
                  </Text>
                </View>
              ) : null}
              {line.unitOfMeasure ? (
                <Text className="text-xs text-muted-foreground">
                  {line.unitOfMeasure}
                </Text>
              ) : null}
            </View>
          </View>

          <View className="items-end justify-center min-w-[72px]">
            <Text
              className={clsx(
                "text-2xl font-bold",
                isPicked ? "text-green-500" : "text-foreground",
              )}
            >
              {line.quantityPicked}
              <Text
                className={clsx(
                  "text-base font-normal",
                  isPicked ? "text-green-500/60" : "text-muted-foreground",
                )}
              >
                /{line.quantityOrdered}
              </Text>
            </Text>

            <Text
              className={clsx(
                "text-xs font-medium mt-1",
                isPicked ? "text-green-500" : "text-primary",
              )}
            >
              {isPicked
                ? "Completed"
                : line.quantityPicked > 0
                  ? `${percent}% picked`
                  : "Ready"}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}
