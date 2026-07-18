import { useState, useCallback } from "react";

type ToastVariant = "success" | "error" | "warning" | "info";

interface ToastState {
  visible: boolean;
  message: string;
  variant: ToastVariant;
}

export function useToast() {
  const [toast, setToast] = useState<ToastState>({
    visible: false,
    message: "",
    variant: "info",
  });

  const showToast = useCallback(
    (message: string, variant: ToastVariant = "info") => {
      setToast({ visible: true, message, variant });
    },
    []
  );

  const hideToast = useCallback(() => {
    setToast((prev) => ({ ...prev, visible: false }));
  }, []);

  return {
    toast,
    showToast,
    hideToast,
  };
}
