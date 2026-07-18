import {
  TextInput,
  View,
  Text,
  type TextInputProps,
} from "react-native";
import { clsx } from "clsx";

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerClassName?: string;
}

export function Input({
  label,
  error,
  containerClassName,
  className,
  ...props
}: InputProps) {
  return (
    <View className={clsx("w-full", containerClassName)}>
      {label ? (
        <Text className="text-sm font-medium text-foreground mb-1.5">
          {label}
        </Text>
      ) : null}
      <TextInput
        className={clsx(
          "bg-background border border-border rounded-lg px-4 py-3",
          "text-foreground text-base",
          "min-h-[44px]",
          error && "border-destructive",
          className
        )}
        placeholderTextColor="#64748B"
        {...props}
      />
      {error ? (
        <Text className="text-sm text-destructive mt-1">{error}</Text>
      ) : null}
    </View>
  );
}
