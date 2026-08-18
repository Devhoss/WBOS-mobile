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
