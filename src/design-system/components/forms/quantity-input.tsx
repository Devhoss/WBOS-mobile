import { View, Text, TouchableOpacity } from "react-native";
import { clsx } from "clsx";

interface QuantityInputProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  className?: string;
}

export function QuantityInput({
  value,
  onChange,
  min = 0,
  max = 99999,
  step = 1,
  label,
  className,
}: QuantityInputProps) {
  function decrement() {
    const next = value - step;
    if (next >= min) onChange(next);
  }

  function increment() {
    const next = value + step;
    if (next <= max) onChange(next);
  }

  return (
    <View className={clsx("items-center", className)}>
      {label ? (
        <Text className="text-sm text-muted-foreground mb-2">{label}</Text>
      ) : null}
      <View className="flex-row items-center gap-4">
        <TouchableOpacity
          onPress={decrement}
          disabled={value <= min}
          className={clsx(
            "w-[48px] h-[48px] rounded-lg items-center justify-center",
            "bg-secondary active:bg-secondary/80",
            value <= min && "opacity-40"
          )}
        >
          <Text className="text-foreground text-2xl font-bold">−</Text>
        </TouchableOpacity>

        <Text className="text-foreground text-3xl font-bold min-w-[80px] text-center">
          {value}
        </Text>

        <TouchableOpacity
          onPress={increment}
          disabled={value >= max}
          className={clsx(
            "w-[48px] h-[48px] rounded-lg items-center justify-center",
            "bg-secondary active:bg-secondary/80",
            value >= max && "opacity-40"
          )}
        >
          <Text className="text-foreground text-2xl font-bold">+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
