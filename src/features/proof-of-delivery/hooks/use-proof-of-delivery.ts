import { useCallback, useEffect, useReducer, useRef, useState } from "react";

import {
  getProofOfDelivery,
  removePodDocument,
  reorderPodDocuments,
  uploadPodDocument,
} from "@/api/proof-of-delivery";
import type { PodPickedFile, PodView } from "@/api/proof-of-delivery/types";
import { toUserMessage } from "@/shared/errors/user-message";

import {
  emptyQueue,
  failedItems,
  pendingItems,
  queueReducer,
  type QueueItem,
  type QueueState,
} from "./upload-queue";

/**
 * Drives the proof-of-delivery screen: the saved set, and the queue of pages
 * waiting to join it.
 *
 * Uploads run one at a time rather than in parallel. Sequential is what makes
 * the resulting page order match the order the driver arranged, and a phone on
 * a weak connection uploads several small files faster in series than it does
 * in parallel anyway.
 */

export interface UseProofOfDelivery {
  view: PodView | null;
  loading: boolean;
  error: string | null;
  queue: QueueState;
  busy: boolean;
  refresh: () => Promise<void>;
  enqueue: (files: PodPickedFile[]) => void;
  removeQueued: (key: string) => void;
  moveQueued: (key: string, direction: -1 | 1) => void;
  uploadAll: (shipmentId: string) => Promise<void>;
  retryFailed: (shipmentId: string) => Promise<void>;
  clearSettled: () => void;
  removeDocument: (documentId: string) => Promise<void>;
  reorder: (shipmentId: string, documentIds: string[]) => Promise<void>;
}

export function useProofOfDelivery(salesOrderId: string): UseProofOfDelivery {
  const [view, setView] = useState<PodView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [queue, dispatch] = useReducer(queueReducer, emptyQueue);

  /**
   * The live queue, readable from a callback without making that callback
   * depend on it.
   *
   * `uploadAll` used to close over `queue`, which meant the Upload button was
   * only correct if React had re-rendered between the driver's last reorder and
   * their press. It usually had — and then a reorder immediately followed by
   * Upload sent the pages in the old order, which is the page order the server
   * assigns and therefore the order the signed pages are filed in. Reading the
   * ref removes the window entirely.
   */
  const queueRef = useRef(queue);
  queueRef.current = queue;

  // Guards a state update after the screen has gone. Without it, backing out
  // mid-upload logs a React warning and, worse, can resurrect a stale view.
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    try {
      const next = await getProofOfDelivery(salesOrderId);
      if (alive.current) {
        setView(next);
        setError(null);
      }
    } catch (err) {
      if (alive.current) setError(toUserMessage(err, "Could not load proof of delivery."));
    } finally {
      if (alive.current) setLoading(false);
    }
  }, [salesOrderId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  /** Sends one item and records the outcome. Never throws. */
  const sendOne = useCallback(async (shipmentId: string, item: QueueItem) => {
    dispatch({ type: "start", key: item.key });
    try {
      const { document, duplicate } = await uploadPodDocument(shipmentId, item.file, {
        onProgress: (fraction) => dispatch({ type: "progress", key: item.key, fraction }),
      });
      dispatch({ type: "succeeded", key: item.key, documentId: document.id, duplicate });
    } catch (err) {
      // Recorded, not thrown: one bad page must not abandon the pages after it.
      dispatch({
        type: "failed",
        key: item.key,
        message: toUserMessage(err, "Upload failed."),
      });
    }
  }, []);

  const drain = useCallback(
    async (shipmentId: string, items: QueueItem[]) => {
      if (items.length === 0) return;
      setBusy(true);
      try {
        for (const item of items) {
          await sendOne(shipmentId, item);
        }
      } finally {
        if (alive.current) setBusy(false);
      }
      // Refresh regardless of how many failed — the ones that landed are part
      // of the set now and the driver should see them.
      await refresh();
    },
    [refresh, sendOne],
  );

  const uploadAll = useCallback(
    async (shipmentId: string) => {
      await drain(shipmentId, pendingItems(queueRef.current));
    },
    [drain],
  );

  const retryFailed = useCallback(
    async (shipmentId: string) => {
      const retrying = failedItems(queueRef.current);
      if (retrying.length === 0) return;
      dispatch({ type: "retryAllFailed" });
      // Only the failures are re-sent; pages that already landed are untouched.
      await drain(shipmentId, retrying);
    },
    [drain],
  );

  const removeDocument = useCallback(
    async (documentId: string) => {
      setBusy(true);
      try {
        await removePodDocument(documentId);
        await refresh();
      } catch (err) {
        if (alive.current) setError(toUserMessage(err, "Could not remove this document."));
      } finally {
        if (alive.current) setBusy(false);
      }
    },
    [refresh],
  );

  const reorder = useCallback(
    async (shipmentId: string, documentIds: string[]) => {
      setBusy(true);
      try {
        await reorderPodDocuments(shipmentId, documentIds);
        await refresh();
      } catch (err) {
        if (alive.current) setError(toUserMessage(err, "Could not save the new page order."));
      } finally {
        if (alive.current) setBusy(false);
      }
    },
    [refresh],
  );

  return {
    view,
    loading,
    error,
    queue,
    busy,
    refresh,
    enqueue: useCallback((files: PodPickedFile[]) => dispatch({ type: "enqueue", files }), []),
    removeQueued: useCallback((key: string) => dispatch({ type: "remove", key }), []),
    moveQueued: useCallback(
      (key: string, direction: -1 | 1) => dispatch({ type: "move", key, direction }),
      [],
    ),
    uploadAll,
    retryFailed,
    clearSettled: useCallback(() => dispatch({ type: "clearSettled" }), []),
    removeDocument,
    reorder,
  };
}
