import { useState, useCallback, useRef, type MutableRefObject } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { PickLineDetail, PickSession } from "@/api/picking/types";
import { useConfirmPickLine, useSubmitPickScanAction } from "@/features/picking";
import { useSettings } from "@/features/settings";
import { playSuccessSound, playErrorSound } from "@/shared/utils/sound";
import * as Haptics from "expo-haptics";

export type ScanMode = "increment" | "quantity";

export interface PendingBulkLine {
  lineId: string;
  productName: string;
  productSku: string;
  currentQty: number;
  maxQty: number;
  barcode: string;
}

export interface PickingScanState {
  flashLineId: string | null;
  flashVariant: "success" | "error";
  flashText: string;
  errorBarcode: string | null;
  undoStack: UndoEntry[];
}

export interface UndoEntry {
  lineId: string;
  previousQuantity: number;
}

export interface UsePickingScanReturn {
  flashLineId: string | null;
  flashVariant: "success" | "error";
  flashText: string;
  errorBarcode: string | null;
  undoStack: UndoEntry[];
  handleScan: (barcode: string, scanId?: number) => Promise<void>;
  handleUndo: () => void;
  showGreenFlash: () => void;
  pendingBulkLine: PendingBulkLine | null;
  submitBulkQuantity: (quantity: number) => void;
  cancelBulkQuantity: () => void;
}

function createClientEventId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function scanLog(message: string, data?: unknown) {
  if (__DEV__) {
    console.log(`[WBOS_PICK_SCAN] ${message}`, data ?? "");
  }
}

export function usePickingScan(
  session: PickSession | undefined,
  taskId: string,
  scanMode: ScanMode,
  onPick?: () => void,
  consumeBarcodeRef?: MutableRefObject<((barcode: string) => void) | undefined>,
): UsePickingScanReturn {
  const queryClient = useQueryClient();
  const confirmMutation = useConfirmPickLine(taskId);
  const pickActionMutation = useSubmitPickScanAction(taskId);
  const { settings } = useSettings();

  const [flashLineId, setFlashLineId] = useState<string | null>(null);
  const [flashVariant, setFlashVariant] = useState<"success" | "error">("success");
  const [flashText, setFlashText] = useState("");
  const [errorBarcode, setErrorBarcode] = useState<string | null>(null);
  const [undoStack, setUndoStack] = useState<UndoEntry[]>([]);
  const [pendingBulkLine, setPendingBulkLine] = useState<PendingBulkLine | null>(null);
  const undoStackRef = useRef<UndoEntry[]>([]);
  const processingLines = useRef<Set<string>>(new Set());

  function playFeedback(variant: "success" | "error") {
    queueMicrotask(() => {
      if (settings.scannerSoundEnabled) {
        if (variant === "success") playSuccessSound();
        else playErrorSound();
      }
      if (settings.hapticsEnabled) {
        if (variant === "error") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } else {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
      }
    });
  }

  const handleScan = useCallback(
    async (barcode: string, scanId?: number) => {
      const currentSession = queryClient.getQueryData<PickSession>(["pick-session", taskId]);
      if (!currentSession) return;

      const pendingLine = currentSession.lines.find((l) => l.status === "pending");
      if (!pendingLine) return;

      const picked = pendingLine.quantityPicked;

      if (scanMode === "quantity" && processingLines.current.has(pendingLine.id)) return;

      const b = (barcode ?? "").trim().toLowerCase();
      const matches =
        pendingLine.barcode?.toLowerCase() === b ||
        pendingLine.productSku.toLowerCase() === b;

      if (!matches) {
        playFeedback("error");
        setFlashLineId(pendingLine.id);
        setFlashVariant("error");
        setFlashText(`Expected: ${pendingLine.productName}`);
        setErrorBarcode(barcode);
        setTimeout(() => {
          setFlashLineId(null);
          setErrorBarcode(null);
        }, 1200);
        return;
      }

      const remaining = pendingLine.quantityOrdered - picked;
      if (remaining <= 0) return;

      if (scanMode === "quantity") {
        playFeedback("success");
        setPendingBulkLine({
          lineId: pendingLine.id,
          productName: pendingLine.productName,
          productSku: pendingLine.productSku,
          currentQty: pendingLine.quantityPicked,
          maxQty: pendingLine.quantityOrdered,
          barcode: barcode,
        });
        return;
      }

      consumeBarcodeRef?.current?.(barcode);

      onPick?.();
      playFeedback("success");

      undoStackRef.current.push({
        lineId: pendingLine.id,
        previousQuantity: pendingLine.quantityPicked,
      });
      scanLog("undo:push", {
        lineId: pendingLine.id,
        previousQuantity: pendingLine.quantityPicked,
        stackLength: undoStackRef.current.length,
      });
      setUndoStack([...undoStackRef.current]);

      const clientEventId = createClientEventId();
      scanLog("pickAction:dispatch", {
        lineId: pendingLine.id,
        barcode,
        clientEventId,
        stackLength: undoStackRef.current.length,
      });
      pickActionMutation.mutate(
        {
          taskLineId: pendingLine.id,
          barcode,
          delta: 1,
          clientEventId,
          scannedAt: new Date().toISOString(),
        },
        {
          onError: (error) => {
            scanLog("pickAction:error", {
              lineId: pendingLine.id,
              clientEventId,
              error,
              stackLengthBeforePop: undoStackRef.current.length,
            });
            undoStackRef.current.pop();
            setUndoStack([...undoStackRef.current]);
          },
          onSuccess: () => {
            scanLog("pickAction:success", { lineId: pendingLine.id, clientEventId });
          },
        },
      );

      setFlashLineId(pendingLine.id);
      setFlashVariant("success");
      setFlashText(`✓ ${pendingLine.productName}`);
      setTimeout(() => setFlashLineId(null), 500);
    },
    [pickActionMutation, onPick, scanMode, settings, consumeBarcodeRef, queryClient, taskId],
  );

  const submitBulkQuantity = useCallback((quantity: number) => {
    if (!pendingBulkLine) return;
    if (processingLines.current.has(pendingBulkLine.lineId)) return;

    processingLines.current.add(pendingBulkLine.lineId);

    const addQty = Math.max(0, quantity);
    const targetQty = Math.min(pendingBulkLine.currentQty + addQty, pendingBulkLine.maxQty);

    onPick?.();
    playFeedback("success");

    undoStackRef.current.push({
      lineId: pendingBulkLine.lineId,
      previousQuantity: pendingBulkLine.currentQty,
    });
    scanLog("undo:pushBulk", {
      lineId: pendingBulkLine.lineId,
      previousQuantity: pendingBulkLine.currentQty,
      stackLength: undoStackRef.current.length,
    });
    setUndoStack([...undoStackRef.current]);

    setFlashLineId(pendingBulkLine.lineId);
    setFlashVariant("success");
    setFlashText(`+${addQty}  (${targetQty} total)`);
    setTimeout(() => setFlashLineId(null), 800);

    const lineId = pendingBulkLine.lineId;
    setPendingBulkLine(null);

    confirmMutation.mutate(
      { lineId, quantity: targetQty },
      {
        onError: () => {
          undoStackRef.current.pop();
          setUndoStack([...undoStackRef.current]);
        },
        onSettled: () => {
          processingLines.current.delete(lineId);
        },
      },
    );
  }, [pendingBulkLine, confirmMutation, onPick, settings]);

  const cancelBulkQuantity = useCallback(() => {
    setPendingBulkLine(null);
  }, []);

  const handleUndo = useCallback(() => {
    const entries = undoStackRef.current;
    scanLog("undo:requested", {
      stackLength: entries.length,
      processingLines: Array.from(processingLines.current),
    });
    if (entries.length === 0) {
      scanLog("undo:ignored-empty");
      return;
    }
    const last = entries[entries.length - 1];
    if (processingLines.current.has(last.lineId)) {
      scanLog("undo:ignored-processing", {
        lineId: last.lineId,
        preservedEntry: last,
        stackLength: entries.length,
      });
      return;
    }
    entries.pop();
    scanLog("undo:popped", {
      lineId: last.lineId,
      previousQuantity: last.previousQuantity,
      stackLengthAfterPop: entries.length,
      isProcessing: false,
    });
    undoStackRef.current = entries;
    setUndoStack([...entries]);
    setFlashLineId(null);
    setErrorBarcode(null);
    processingLines.current.add(last.lineId);
    scanLog("undo:mutation:dispatch", last);
    confirmMutation.mutate(
      {
        lineId: last.lineId,
        quantity: last.previousQuantity,
      },
      {
        onError: (error) => {
          scanLog("undo:mutation:error", { last, error });
        },
        onSettled: () => {
          scanLog("undo:mutation:settled", last);
          processingLines.current.delete(last.lineId);
        },
      },
    );
  }, [confirmMutation]);

  const showGreenFlash = useCallback(() => {
    setFlashLineId("__overlay__");
    setFlashVariant("success");
    setFlashText("");
    setTimeout(() => setFlashLineId(null), 400);
  }, []);

  return {
    flashLineId,
    flashVariant,
    flashText,
    errorBarcode,
    undoStack,
    handleScan,
    handleUndo,
    showGreenFlash,
    pendingBulkLine,
    submitBulkQuantity,
    cancelBulkQuantity,
  };
}
