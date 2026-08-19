import { useState, useCallback, useRef, type MutableRefObject } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { PickSession } from "@/api/picking/types";
import { useConfirmPickLine, useSubmitPickScanAction } from "@/features/picking";
import { useSettings } from "@/features/settings";
import { playSuccessSound, playErrorSound } from "@/shared/utils/sound";
import * as Haptics from "expo-haptics";
import { toUserMessage } from "@/shared/errors/user-message";

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
  /** Identity, so a failure removes its own entry and not the newest one. */
  id: string;
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

  const playFeedback = useCallback((variant: "success" | "error") => {
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
  }, [settings]);

  /**
   * Report a mutation that the server refused or never received.
   *
   * The scan path used to roll the optimistic state back on error and show
   * nothing at all — and it set the green success flash unconditionally, before
   * the request resolved, so a REJECTED scan still flashed green. The picker
   * had no way to tell a rejected pick from an accepted one.
   *
   * This reuses the existing error-flash affordance rather than adding a second
   * vocabulary for failure.
   */
  /**
   * Remove one entry by identity.
   *
   * Both error handlers called `pop()`, which removes the most recent entry --
   * not necessarily the one this mutation pushed. A scan that failed slowly
   * (up to 30s while mutations retried) would discard the undo record of a
   * later successful pick, so Undo then reverted to a stale quantity.
   */
  const dropUndoEntry = useCallback((entry: UndoEntry) => {
    undoStackRef.current = undoStackRef.current.filter((e) => e.id !== entry.id);
    setUndoStack([...undoStackRef.current]);
  }, []);

  const flashFailure = useCallback(
    (lineId: string, error: unknown, fallback: string) => {
      playFeedback("error");
      setFlashLineId(lineId);
      setFlashVariant("error");
      setFlashText(toUserMessage(error, fallback));
      setTimeout(() => setFlashLineId(null), 2000);
    },
    [playFeedback],
  );

  const handleScan = useCallback(
    async (barcode: string, _scanId?: number) => {
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
      if (remaining <= 0) {
        // A scan that changes nothing and says nothing reads as a dead scanner.
        // This is reachable whenever the line is full but the server has not
        // marked it COMPLETED, so it is still the pending line -- exactly the
        // state the frozen-at-100% report described.
        flashFailure(
          pendingLine.id,
          null,
          `${pendingLine.productName} is already fully picked. Pull down to refresh.`,
        );
        return;
      }

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

      const undoEntry: UndoEntry = {
        id: createClientEventId(),
        lineId: pendingLine.id,
        previousQuantity: pendingLine.quantityPicked,
      };
      undoStackRef.current.push(undoEntry);
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
            dropUndoEntry(undoEntry);
            // Overwrites the optimistic green flash set below, so a refused
            // pick can never be mistaken for an accepted one.
            flashFailure(pendingLine.id, error, "That pick was not saved. Try again.");
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
    [pickActionMutation, onPick, scanMode, playFeedback, consumeBarcodeRef, queryClient, taskId, flashFailure, dropUndoEntry],
  );

  const submitBulkQuantity = useCallback((quantity: number) => {
    if (!pendingBulkLine) return;
    if (processingLines.current.has(pendingBulkLine.lineId)) return;

    processingLines.current.add(pendingBulkLine.lineId);

    // Clamp, then report the clamped figure. Entering 50 against a line of 10
    // used to flash "+50  (10 total)", which is two contradictory numbers.
    const room = Math.max(0, pendingBulkLine.maxQty - pendingBulkLine.currentQty);
    const addQty = Math.min(Math.max(0, quantity), room);
    const targetQty = pendingBulkLine.currentQty + addQty;

    if (addQty === 0) {
      flashFailure(
        pendingBulkLine.lineId,
        null,
        `${pendingBulkLine.productName} is already fully picked.`,
      );
      setPendingBulkLine(null);
      processingLines.current.delete(pendingBulkLine.lineId);
      return;
    }

    onPick?.();
    playFeedback("success");

    const undoEntry: UndoEntry = {
      id: createClientEventId(),
      lineId: pendingBulkLine.lineId,
      previousQuantity: pendingBulkLine.currentQty,
    };
    undoStackRef.current.push(undoEntry);
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
        onError: (error) => {
          dropUndoEntry(undoEntry);
          flashFailure(lineId, error, "That quantity was not saved. Try again.");
        },
        onSettled: () => {
          processingLines.current.delete(lineId);
        },
      },
    );
  }, [pendingBulkLine, confirmMutation, onPick, playFeedback, flashFailure, dropUndoEntry]);

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
    // Undo deliberately targets the newest entry -- that is what "undo" means
    // here -- but removal goes through the same identity-based path.
    dropUndoEntry(last);
    scanLog("undo:popped", {
      lineId: last.lineId,
      previousQuantity: last.previousQuantity,
      stackLengthAfterPop: undoStackRef.current.length,
      isProcessing: false,
    });
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
          flashFailure(last.lineId, error, "Could not undo that pick. Try again.");
        },
        onSettled: () => {
          scanLog("undo:mutation:settled", last);
          processingLines.current.delete(last.lineId);
        },
      },
    );
  }, [confirmMutation, flashFailure, dropUndoEntry]);

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
