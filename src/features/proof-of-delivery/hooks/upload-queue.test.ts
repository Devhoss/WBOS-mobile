import { describe, expect, it } from "vitest";

import type { PodPickedFile } from "@/api/proof-of-delivery/types";

import {
  describeQueue,
  emptyQueue,
  failedItems,
  isUploading,
  overallProgress,
  pendingItems,
  queueReducer,
  type QueueState,
} from "./upload-queue";

/**
 * The upload queue is where partial failure lives, so it is tested away from
 * the renderer: the states that matter — three of five uploaded, retry only the
 * failures, reorder before sending — are all reachable here directly.
 */

function file(name: string, source: PodPickedFile["source"] = "camera"): PodPickedFile {
  return { uri: `file:///${name}`, name, type: "image/jpeg", source };
}

function run(state: QueueState, ...actions: Parameters<typeof queueReducer>[1][]): QueueState {
  return actions.reduce(queueReducer, state);
}

function enqueued(...names: string[]): QueueState {
  return queueReducer(emptyQueue, { type: "enqueue", files: names.map((n) => file(n)) });
}

describe("adding pages", () => {
  it("queues several files at once, in the order they were chosen", () => {
    const state = enqueued("page-1.jpg", "page-2.jpg");

    expect(state.items).toHaveLength(2);
    expect(state.items.map((i) => i.file.name)).toEqual(["page-1.jpg", "page-2.jpg"]);
    expect(state.items.every((i) => i.status === "queued")).toBe(true);
  });

  it("appends a later pick after the pages already waiting", () => {
    const state = queueReducer(enqueued("page-1.jpg"), {
      type: "enqueue",
      files: [file("page-2.jpg")],
    });

    expect(state.items.map((i) => i.file.name)).toEqual(["page-1.jpg", "page-2.jpg"]);
  });

  it("mixes camera photos and gallery photos in one session", () => {
    const state = run(
      emptyQueue,
      { type: "enqueue", files: [file("shot.jpg", "camera")] },
      { type: "enqueue", files: [file("saved.jpg", "library"), file("saved-2.jpg", "library")] },
    );

    expect(state.items.map((i) => i.file.source)).toEqual(["camera", "library", "library"]);
  });

  it("gives every item a distinct key, even across separate picks", () => {
    const state = run(
      emptyQueue,
      { type: "enqueue", files: [file("a.jpg"), file("b.jpg")] },
      { type: "enqueue", files: [file("c.jpg")] },
    );

    expect(new Set(state.items.map((i) => i.key)).size).toBe(3);
  });
});

describe("arranging before upload", () => {
  it("removes a single page without touching the others", () => {
    const state = enqueued("a.jpg", "b.jpg", "c.jpg");
    const after = queueReducer(state, { type: "remove", key: state.items[1].key });

    expect(after.items.map((i) => i.file.name)).toEqual(["a.jpg", "c.jpg"]);
  });

  it("moves a page later", () => {
    const state = enqueued("a.jpg", "b.jpg", "c.jpg");
    const after = queueReducer(state, { type: "move", key: state.items[0].key, direction: 1 });

    expect(after.items.map((i) => i.file.name)).toEqual(["b.jpg", "a.jpg", "c.jpg"]);
  });

  it("moves a page earlier", () => {
    const state = enqueued("a.jpg", "b.jpg", "c.jpg");
    const after = queueReducer(state, { type: "move", key: state.items[2].key, direction: -1 });

    expect(after.items.map((i) => i.file.name)).toEqual(["a.jpg", "c.jpg", "b.jpg"]);
  });

  it("ignores a move off either end rather than wrapping around", () => {
    const state = enqueued("a.jpg", "b.jpg");

    expect(
      queueReducer(state, { type: "move", key: state.items[0].key, direction: -1 }).items,
    ).toEqual(state.items);
    expect(
      queueReducer(state, { type: "move", key: state.items[1].key, direction: 1 }).items,
    ).toEqual(state.items);
  });
});

describe("partial failure", () => {
  it("keeps the pages that succeeded and the pages that did not", () => {
    const state = enqueued("a.jpg", "b.jpg", "c.jpg");
    const [a, b, c] = state.items.map((i) => i.key);

    const after = run(
      state,
      { type: "start", key: a },
      { type: "succeeded", key: a, documentId: "doc-a", duplicate: false },
      { type: "start", key: b },
      { type: "failed", key: b, message: "Network error." },
      { type: "start", key: c },
      { type: "succeeded", key: c, documentId: "doc-c", duplicate: false },
    );

    expect(after.items.map((i) => i.status)).toEqual(["uploaded", "failed", "uploaded"]);
    // The failure is still on screen. An upload that vanishes is
    // indistinguishable from one that worked.
    expect(failedItems(after)).toHaveLength(1);
    expect(failedItems(after)[0].file.name).toBe("b.jpg");
  });

  it("retries only the failures, leaving successful pages alone", () => {
    const state = enqueued("a.jpg", "b.jpg");
    const [a, b] = state.items.map((i) => i.key);

    const afterRun = run(
      state,
      { type: "start", key: a },
      { type: "succeeded", key: a, documentId: "doc-a", duplicate: false },
      { type: "start", key: b },
      { type: "failed", key: b, message: "Network error." },
    );

    const retried = queueReducer(afterRun, { type: "retryAllFailed" });

    expect(retried.items[0].status).toBe("uploaded");
    expect(retried.items[0].documentId).toBe("doc-a");
    expect(retried.items[1].status).toBe("queued");
    expect(retried.items[1].error).toBeNull();
    // Only the failure is pending, so only it is re-sent.
    expect(pendingItems(retried).map((i) => i.file.name)).toEqual(["b.jpg"]);
  });

  it("reuses the item's key on retry instead of appending a new row", () => {
    const state = enqueued("a.jpg");
    const key = state.items[0].key;

    const retried = run(
      state,
      { type: "start", key },
      { type: "failed", key, message: "Timed out." },
      { type: "retry", key },
    );

    expect(retried.items).toHaveLength(1);
    expect(retried.items[0].key).toBe(key);
  });

  it("clears the finished pages but never the failed ones", () => {
    const state = enqueued("a.jpg", "b.jpg", "c.jpg");
    const [a, b, c] = state.items.map((i) => i.key);

    const after = run(
      state,
      { type: "start", key: a },
      { type: "succeeded", key: a, documentId: "doc-a", duplicate: false },
      { type: "start", key: b },
      { type: "failed", key: b, message: "Network error." },
      { type: "start", key: c },
      { type: "succeeded", key: c, documentId: "doc-c", duplicate: true },
      { type: "clearSettled" },
    );

    expect(after.items.map((i) => i.file.name)).toEqual(["b.jpg"]);
    expect(after.items[0].status).toBe("failed");
  });
});

describe("duplicates", () => {
  it("marks a re-sent page as a duplicate rather than a new one", () => {
    const state = enqueued("a.jpg");
    const key = state.items[0].key;

    const after = run(
      state,
      { type: "start", key },
      { type: "succeeded", key, documentId: "doc-a", duplicate: true },
    );

    expect(after.items[0].status).toBe("duplicate");
    expect(after.items[0].documentId).toBe("doc-a");
  });
});

describe("progress", () => {
  it("reports nothing for an empty queue", () => {
    expect(overallProgress(emptyQueue)).toBe(0);
    expect(describeQueue(emptyQueue)).toBeNull();
  });

  it("counts a finished page as whole regardless of its progress events", () => {
    const state = enqueued("a.jpg", "b.jpg");
    const [a] = state.items.map((i) => i.key);

    const after = run(
      state,
      { type: "start", key: a },
      { type: "progress", key: a, fraction: 0.3 },
      { type: "succeeded", key: a, documentId: "doc-a", duplicate: false },
    );

    expect(overallProgress(after)).toBe(0.5);
  });

  it("blends an in-flight page's own progress into the total", () => {
    const state = enqueued("a.jpg", "b.jpg");
    const [a, b] = state.items.map((i) => i.key);

    const after = run(
      state,
      { type: "start", key: a },
      { type: "succeeded", key: a, documentId: "doc-a", duplicate: false },
      { type: "start", key: b },
      { type: "progress", key: b, fraction: 0.5 },
    );

    expect(overallProgress(after)).toBeCloseTo(0.75);
    expect(isUploading(after)).toBe(true);
  });

  it("clamps a progress event outside 0..1", () => {
    const state = enqueued("a.jpg");
    const key = state.items[0].key;

    expect(
      run(state, { type: "start", key }, { type: "progress", key, fraction: 4 }).items[0].progress,
    ).toBe(1);
    expect(
      run(state, { type: "start", key }, { type: "progress", key, fraction: -2 }).items[0].progress,
    ).toBe(0);
  });

  it("says how many failed once the run is over", () => {
    const state = enqueued("a.jpg", "b.jpg");
    const [a, b] = state.items.map((i) => i.key);

    const after = run(
      state,
      { type: "start", key: a },
      { type: "succeeded", key: a, documentId: "doc-a", duplicate: false },
      { type: "start", key: b },
      { type: "failed", key: b, message: "Network error." },
    );

    expect(describeQueue(after)).toBe("1 of 2 failed to upload");
  });

  it("says how many uploaded when everything worked", () => {
    const state = enqueued("a.jpg");
    const key = state.items[0].key;

    const after = run(
      state,
      { type: "start", key },
      { type: "succeeded", key, documentId: "doc-a", duplicate: false },
    );

    expect(describeQueue(after)).toBe("1 uploaded");
  });
});
