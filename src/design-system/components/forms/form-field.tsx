import { View, Text } from "react-native";
import { clsx } from "clsx";

interface FormFieldProps {
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function FormField({
  label,
  error,
  required,
  children,
  className,
}: FormFieldProps) {
  return (
    <View className={clsx("mb-4", className)}>
      <Text className="text-sm font-medium text-foreground mb-1.5">
        {label}
        {required ? <Text className="text-destructive"> *</Text> : null}
      </Text>
      {children}
      {error ? (
        <Text className="text-sm text-destructive mt-1">{error}</Text>
      ) : null}
    </View>
  );
}
