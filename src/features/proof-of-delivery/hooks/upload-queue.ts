import type { PodPickedFile } from "@/api/proof-of-delivery/types";

/**
 * The upload queue, as a pure reducer.
 *
 * Proof of delivery arrives as several photos at once and the network in a
 * customer's yard is not reliable, so the interesting behaviour is all in the
 * failure shapes: three pages succeed and two do not, the driver retries only
 * the two, adds a sixth, and reorders them before any of it is sent. None of
 * that needs a device to be correct, and keeping it here means it can be tested
 * without one.
 *
 * Two rules the rest of the feature depends on:
 *
 *   - a failed item is never dropped from the queue. An upload that disappears
 *     is indistinguishable from one that succeeded, and the whole point of this
 *     screen is that the paperwork is provably filed.
 *   - retry re-uses the item's key. A retry that appends a new row makes the
 *     count climb on every attempt and hides how many pages there really are.
 */

export type QueueItemStatus = "queued" | "uploading" | "uploaded" | "duplicate" | "failed";

export interface QueueItem {
  key: string;
  file: PodPickedFile;
  status: QueueItemStatus;
  /** 0..1, only meaningful while uploading. */
  progress: number;
  error: string | null;
  /** Set once the server has accepted it. */
  documentId: string | null;
}

export interface QueueState {
  items: QueueItem[];
  /** Monotonic, so keys stay unique across several picking sessions. */
  nextKey: number;
}

export type QueueAction =
  | { type: "enqueue"; files: PodPickedFile[] }
  | { type: "remove"; key: string }
  | { type: "move"; key: string; direction: -1 | 1 }
  | { type: "start"; key: string }
  | { type: "progress"; key: string; fraction: number }
  | { type: "succeeded"; key: string; documentId: string; duplicate: boolean }
  | { type: "failed"; key: string; message: string }
  | { type: "retry"; key: string }
  | { type: "retryAllFailed" }
  | { type: "clearSettled" };

export const emptyQueue: QueueState = { items: [], nextKey: 1 };

function patch(state: QueueState, key: string, changes: Partial<QueueItem>): QueueState {
  return {
    ...state,
    items: state.items.map((item) => (item.key === key ? { ...item, ...changes } : item)),
  };
}

export function queueReducer(state: QueueState, action: QueueAction): QueueState {
  switch (action.type) {
    case "enqueue": {
      // Appended, so a page chosen later lands after the pages already waiting
      // — the order the driver picked them in is the order they upload in, and
      // therefore the page order the server assigns.
      const items = action.files.map((file, index) => ({
        key: `q${state.nextKey + index}`,
        file,
        status: "queued" as const,
        progress: 0,
        error: null,
        documentId: null,
      }));
      return {
        items: [...state.items, ...items],
        nextKey: state.nextKey + action.files.length,
      };
    }

    case "remove":
      // Only meaningful before or after an attempt; an in-flight item keeps
      // uploading and its result is discarded by the caller.
      return { ...state, items: state.items.filter((item) => item.key !== action.key) };

    case "move": {
      const index = state.items.findIndex((item) => item.key === action.key);
      const target = index + action.direction;
      if (index === -1 || target < 0 || target >= state.items.length) return state;
      const items = [...state.items];
      [items[index], items[target]] = [items[target], items[index]];
      return { ...state, items };
    }

    case "start":
      return patch(state, action.key, { status: "uploading", progress: 0, error: null });

    case "progress":
      return patch(state, action.key, {
        progress: Math.max(0, Math.min(action.fraction, 1)),
      });

    case "succeeded":
      return patch(state, action.key, {
        status: action.duplicate ? "duplicate" : "uploaded",
        progress: 1,
        error: null,
        documentId: action.documentId,
      });

    case "failed":
      return patch(state, action.key, {
        status: "failed",
        error: action.message,
        progress: 0,
      });

    case "retry":
      return patch(state, action.key, { status: "queued", progress: 0, error: null });

    case "retryAllFailed":
      return {
        ...state,
        items: state.items.map((item) =>
          item.status === "failed"
            ? { ...item, status: "queued" as const, progress: 0, error: null }
            : item,
        ),
      };

    case "clearSettled":
      // Failures stay. Clearing them would be the silent loss this screen exists
      // to prevent.
      return {
        ...state,
        items: state.items.filter(
          (item) => item.status !== "uploaded" && item.status !== "duplicate",
        ),
      };

    default:
      return state;
  }
}

/** Items still to be sent, in the order the driver arranged them. */
export function pendingItems(state: QueueState): QueueItem[] {
  return state.items.filter((item) => item.status === "queued");
}

export function failedItems(state: QueueState): QueueItem[] {
  return state.items.filter((item) => item.status === "failed");
}

export function isUploading(state: QueueState): boolean {
  return state.items.some((item) => item.status === "uploading");
}

/**
 * Overall progress across the session, 0..1.
 *
 * A finished item counts as whole regardless of how its progress events
 * arrived; an untouched one counts as nothing. Reported separately from the
 * per-file figure because a driver watching five pages upload wants to know how
 * far the batch is, not how far page three is.
 */
export function overallProgress(state: QueueState): number {
  if (state.items.length === 0) return 0;
  const total = state.items.reduce((sum, item) => {
    if (item.status === "uploaded" || item.status === "duplicate") return sum + 1;
    if (item.status === "uploading") return sum + item.progress;
    return sum;
  }, 0);
  return total / state.items.length;
}

/** A short line describing where the session got to, for the header. */
export function describeQueue(state: QueueState): string | null {
  if (state.items.length === 0) return null;
  const done = state.items.filter(
    (item) => item.status === "uploaded" || item.status === "duplicate",
  ).length;
  const failed = failedItems(state).length;

  if (isUploading(state) || pendingItems(state).length > 0) {
    return `Uploading ${done}/${state.items.length}`;
  }
  if (failed > 0) {
    return `${failed} of ${state.items.length} failed to upload`;
  }
  return `${done} uploaded`;
}
