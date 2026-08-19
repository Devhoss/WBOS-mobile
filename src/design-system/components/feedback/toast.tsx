import { useEffect, useRef } from "react";
import { Animated, Text } from "react-native";
import { clsx } from "clsx";

type ToastVariant = "success" | "error" | "warning" | "info";

interface ToastProps {
  message: string;
  variant?: ToastVariant;
  visible: boolean;
  onHide: () => void;
  duration?: number;
}

const variantStyles: Record<ToastVariant, string> = {
  success: "bg-green-600",
  error: "bg-destructive",
  warning: "bg-yellow-600",
  info: "bg-primary",
};

export function Toast({
  message,
  variant = "info",
  visible,
  onHide,
  duration = 3000,
}: ToastProps) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;

    Animated.sequence([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.delay(duration),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      // A new message restarts the sequence, which cancels this one. Only the
      // run that actually completed should hide the toast -- otherwise the
      // second message vanished with the first one's remaining time.
      if (finished) onHide();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, message]);

  if (!visible || !message) return null;

  return (
    <Animated.View
      style={{ opacity }}
      className={clsx(
        "absolute bottom-20 left-4 right-4",
        "px-4 py-3 rounded-lg",
        variantStyles[variant]
      )}
    >
      <Text className="text-white text-base font-medium text-center">
        {message}
      </Text>
    </Animated.View>
  );
}
