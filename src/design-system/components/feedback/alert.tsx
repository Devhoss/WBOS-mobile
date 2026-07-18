import { View, Text, TouchableOpacity, Modal } from "react-native";
import { clsx } from "clsx";

type AlertVariant = "info" | "success" | "warning" | "destructive";

interface AlertProps {
  visible: boolean;
  title: string;
  message: string;
  variant?: AlertVariant;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  destructive?: boolean;
}

const iconColors: Record<AlertVariant, string> = {
  info: "text-primary",
  success: "text-green-500",
  warning: "text-yellow-500",
  destructive: "text-destructive",
};

export function Alert({
  visible,
  title,
  message,
  variant = "info",
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
  destructive = false,
}: AlertProps) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View className="flex-1 bg-black/50 items-center justify-center px-6">
        <View className="bg-card rounded-xl p-6 w-full max-w-sm border border-border">
          <Text className={clsx("text-2xl font-bold text-foreground mb-2", iconColors[variant])}>
            {title}
          </Text>
          <Text className="text-muted-foreground text-base mb-6">
            {message}
          </Text>
          <View className="flex-row gap-3">
            <TouchableOpacity
              onPress={onCancel}
              className="flex-1 bg-secondary py-3 rounded-lg items-center min-h-[44px] justify-center"
            >
              <Text className="text-secondary-foreground font-semibold">
                {cancelLabel}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onConfirm}
              className={clsx(
                "flex-1 py-3 rounded-lg items-center min-h-[44px] justify-center",
                destructive ? "bg-destructive" : "bg-primary"
              )}
            >
              <Text className="text-white font-semibold">
                {confirmLabel}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
