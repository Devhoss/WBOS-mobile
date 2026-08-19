import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * A guard against the silent-failure pattern coming back.
 *
 * Every important warehouse mutation was written as
 * `try { await mutate(); invalidate(); } finally { setBusy(false) }` — no
 * `catch`. On failure the spinner stopped and nothing else changed, so a failed
 * Deliver was indistinguishable from a successful one.
 *
 * This is a source-level check, not a behavioural one: the project has no React
 * Native test renderer, and adding one for this would be a larger change than
 * the fix. It reads the real files, so it fails if a handler loses its
 * reporting — which is the regression actually worth catching. The message
 * formatting itself is covered behaviourally in
 * `src/shared/errors/user-message.test.ts`.
 */

function read(relativePath: string) {
  return readFileSync(resolve(__dirname, "../..", relativePath), "utf8");
}

/** The body of `async function <name>(...) { ... }`, by brace matching. */
function handlerBody(source: string, name: string): string {
  const start = source.indexOf(`async function ${name}(`);
  if (start === -1) throw new Error(`handler ${name} not found`);

  const open = source.indexOf("{", start);
  let depth = 0;
  for (let i = open; i < source.length; i++) {
    if (source[i] === "{") depth++;
    if (source[i] === "}") {
      depth--;
      if (depth === 0) return source.slice(open, i + 1);
    }
  }
  throw new Error(`unbalanced braces in ${name}`);
}

const PICKING_SCREEN = "app/(app)/picking/[id].tsx";
const TASK_SCREEN = "app/(app)/tasks/[id].tsx";
const SCAN_HOOK = "features/scanner/hooks/use-picking-scan.ts";

const IMPORTANT_HANDLERS = [
  "handleDeliver",
  "handleMarkLoaded",
  "handleSaveWarehouseNotes",
  "handleStartPicking",
  "handleCompleteTask",
  "handleViewInvoice",
];

describe("warehouse mutations never fail silently", () => {
  const screen = read(PICKING_SCREEN);

  describe.each(IMPORTANT_HANDLERS)("%s", (name) => {
    const body = handlerBody(screen, name);

    it("catches its failure", () => {
      expect(body).toMatch(/\bcatch\s*\(/);
    });

    it("tells the user something", () => {
      expect(body).toMatch(/showToast\(/);
    });

    it("uses the shared message extractor rather than raw error text", () => {
      // Guards against `showToast(String(err))` or `err.message`, which would
      // put "Request failed with status code 500" in front of a picker.
      expect(body).toMatch(/toUserMessage\(/);
      expect(body).not.toMatch(/showToast\(\s*(String\()?err(or)?(\.message)?\s*[,)]/);
    });

    it("reports as an error, not as a neutral notice", () => {
      expect(body).toMatch(/showToast\([\s\S]*?"error"\s*\);/);
    });
  });

  it("does not swallow failures with a bare finally", () => {
    // A `finally` that resets busy state is correct and expected; a `try`
    // with a `finally` and NO `catch` is the defect.
    for (const name of IMPORTANT_HANDLERS) {
      const body = handlerBody(screen, name);
      if (body.includes("finally")) {
        expect(body, `${name} has finally but no catch`).toMatch(/\bcatch\s*\(/);
      }
    }
  });

  it("closes the notes editor only after the save succeeds", () => {
    // Otherwise a failed save discards what the user typed while telling them
    // it failed — the worst of both.
    const body = handlerBody(screen, "handleSaveWarehouseNotes");
    const awaitIndex = body.indexOf("await updateWarehouseNotes");
    const closeIndex = body.indexOf("setShowNotesInput(false)");
    const catchIndex = body.indexOf("catch");

    expect(awaitIndex).toBeGreaterThan(-1);
    expect(closeIndex).toBeGreaterThan(awaitIndex);
    expect(closeIndex).toBeLessThan(catchIndex);
  });

  it("does not advance the cache after a failed mutation", () => {
    // `invalidateQueries` must sit on the success path. If it ran in a
    // `finally`, a failed Deliver would refetch and repaint as though
    // something had changed.
    for (const name of ["handleDeliver", "handleMarkLoaded", "handleSaveWarehouseNotes"]) {
      const body = handlerBody(screen, name);
      const finallyIndex = body.indexOf("finally");
      const invalidateIndex = body.indexOf("invalidateQueries");
      expect(invalidateIndex, `${name} invalidates`).toBeGreaterThan(-1);
      expect(invalidateIndex, `${name} invalidates before finally`).toBeLessThan(finallyIndex);
    }
  });
});

describe("scan mutations report rejection", () => {
  const hook = read(SCAN_HOOK);

  it("has a single failure affordance rather than silent rollbacks", () => {
    expect(hook).toMatch(/const flashFailure = useCallback\(/);
    expect(hook).toMatch(/toUserMessage\(/);
  });

  it("every onError reports, not just rolls back", () => {
    // The pick-action handler set a green success flash unconditionally, right
    // after firing the mutation, so a REJECTED scan still flashed green. Each
    // onError must now overwrite that with a failure.
    const onErrorBlocks = hook.match(/onError:\s*\([^)]*\)\s*=>\s*\{[\s\S]*?\n {8}\},/g) ?? [];
    expect(onErrorBlocks.length).toBeGreaterThanOrEqual(3);
    for (const block of onErrorBlocks) {
      expect(block).toMatch(/flashFailure\(/);
    }
  });
});

/**
 * The guard above only ever read the picking screen, so the identical defect in
 * the task detail screen — `handleStart` and `handleComplete` as bare
 * `mutateAsync` calls with no `catch` — sat next to a passing suite. A hardcoded
 * file list is a guard with a blind spot; these are the other screens that
 * mutate.
 */
/**
 * The guard above only ever read the picking screen, so the identical defect in
 * the task detail screen -- `handleStart` and `handleComplete` as bare
 * `mutateAsync` calls with no `catch` -- sat next to a passing suite. A
 * hardcoded file list is a guard with a blind spot; these are the other screens
 * that mutate.
 */
describe("task detail mutations never fail silently", () => {
  const screen = read(TASK_SCREEN);

  describe.each(["handleStart", "handleComplete"])("%s", (name) => {
    const body = handlerBody(screen, name);

    it("catches its failure", () => {
      expect(body).toMatch(/\bcatch\s*\(/);
    });

    it("tells the user, through the shared message extractor", () => {
      expect(body).toMatch(/showToast\(/);
      expect(body).toMatch(/toUserMessage\(/);
      expect(body).toMatch(/"error"\s*\)/);
    });
  });

  it("does not congratulate the user on a completion the server refused", () => {
    // playSuccessSound() ran unconditionally after the await. Once the await is
    // wrapped, the catch has to stop rather than fall through to the sound.
    const body = handlerBody(screen, "handleComplete");
    const catchIndex = body.indexOf("catch");
    const soundIndex = body.indexOf("playSuccessSound()");
    expect(catchIndex).toBeGreaterThan(-1);
    expect(soundIndex).toBeGreaterThan(catchIndex);
    expect(body.slice(catchIndex, soundIndex)).toMatch(/return;/);
  });
});

describe("a raised toast has something to render it", () => {
  const screen = read(PICKING_SCREEN);

  it("mounts a Toast inside the scanner branch as well as the summary branch", () => {
    // handleCompleteTask puts the scanner back when the server refuses, then
    // raises a toast. The only <Toast> lived in the summary branch, which that
    // render path returns before reaching -- so the message went nowhere. Every
    // handler-level guard above passed while the user saw nothing.
    const open = screen.search(/<ScannerErrorBoundary[\s>]/);
    const close = screen.indexOf("</ScannerErrorBoundary>");
    expect(open).toBeGreaterThan(-1);
    expect(close).toBeGreaterThan(open);

    expect(screen.slice(open, close)).toMatch(/<Toast\s/);
    expect(screen.slice(close)).toMatch(/<Toast\s/);
  });
});
