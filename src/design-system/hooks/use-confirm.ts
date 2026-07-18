import { useState, useCallback } from "react";

interface ConfirmState {
  visible: boolean;
  title: string;
  message: string;
  destructive: boolean;
  resolve: ((value: boolean) => void) | null;
}

export function useConfirm() {
  const [confirm, setConfirm] = useState<ConfirmState>({
    visible: false,
    title: "",
    message: "",
    destructive: false,
    resolve: null,
  });

  const confirmAsync = useCallback(
    (title: string, message: string, destructive = false): Promise<boolean> => {
      return new Promise((resolve) => {
        setConfirm({
          visible: true,
          title,
          message,
          destructive,
          resolve,
        });
      });
    },
    []
  );

  function handleConfirm() {
    confirm.resolve?.(true);
    setConfirm((prev) => ({ ...prev, visible: false, resolve: null }));
  }

  function handleCancel() {
    confirm.resolve?.(false);
    setConfirm((prev) => ({ ...prev, visible: false, resolve: null }));
  }

  return {
    confirm,
    confirmAsync,
    handleConfirm,
    handleCancel,
  };
}
