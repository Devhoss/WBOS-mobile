import { describe, it, expect } from "vitest";

import { toUserMessage } from "./user-message";

/**
 * Warehouse mutations must fail loudly and legibly.
 *
 * Deliver, Mark Loaded and Save Warehouse Notes were written as
 * `try { ... } finally { setBusy(false) }` with no `catch`: a failed request
 * looked exactly like a successful one, because the only visible effect of
 * either was the spinner stopping. A driver could walk away believing a
 * delivery had been recorded when the server never accepted it.
 *
 * The other half of the requirement is that nothing technical leaks out.
 * "Request failed with status code 500" is not an error message.
 */

const FALLBACK = "Could not confirm this delivery. Try again.";

/** An Axios-shaped rejection with a response body. */
function httpError(status: number, data?: unknown) {
  return { isAxiosError: true, message: `Request failed with status code ${status}`, response: { status, data } };
}

describe("toUserMessage", () => {
  describe("server messages are preferred, because they are written for users", () => {
    it("reads the flat `{ error: string }` shape the shipment routes return", () => {
      expect(toUserMessage(httpError(404, { error: "Shipment not found" }), FALLBACK)).toBe(
        "Shipment not found",
      );
    });

    it("reads the nested `{ error: { message } }` shape other routes return", () => {
      expect(
        toUserMessage(
          httpError(409, { error: { code: "SHIPMENT_INVALID_TRANSITION", message: "Only picked shipments can be loaded." } }),
          FALLBACK,
        ),
      ).toBe("Only picked shipments can be loaded.");
    });

    it("reads a bare `{ message }` body", () => {
      expect(toUserMessage(httpError(400, { message: "Quantity exceeds the order." }), FALLBACK)).toBe(
        "Quantity exceeds the order.",
      );
    });

    it("reads a plain-text body", () => {
      expect(toUserMessage(httpError(400, "Barcode did not match."), FALLBACK)).toBe(
        "Barcode did not match.",
      );
    });

    it("truncates a runaway message rather than filling the screen", () => {
      const long = "x".repeat(500);
      const result = toUserMessage(httpError(400, { error: long }), FALLBACK);
      expect(result.length).toBeLessThanOrEqual(200);
      expect(result.endsWith("…")).toBe(true);
    });
  });

  describe("technical detail never reaches the user", () => {
    it("does not surface the raw Axios message", () => {
      const result = toUserMessage(httpError(500), FALLBACK);
      expect(result).not.toMatch(/Request failed with status code/i);
      expect(result).toBe("The server had a problem. Try again in a moment.");
    });

    it("does not surface an HTML error page", () => {
      const result = toUserMessage(httpError(502, "<!DOCTYPE html><html><body>Bad Gateway"), FALLBACK);
      expect(result).not.toMatch(/</);
      expect(result).toBe("The server had a problem. Try again in a moment.");
    });

    it("does not echo transport noise even when the server sends it as a message", () => {
      const result = toUserMessage(
        httpError(500, { error: "Request failed with status code 500" }),
        FALLBACK,
      );
      expect(result).not.toMatch(/status code/i);
    });

    it("never returns a stack trace", () => {
      const err = new Error("boom");
      expect(toUserMessage(err, FALLBACK)).toBe(FALLBACK);
      expect(toUserMessage(err, FALLBACK)).not.toMatch(/at .*\(/);
    });
  });

  describe("status codes get useful wording when the body says nothing", () => {
    it.each([
      [401, "Your session has expired. Please sign in again."],
      [403, "You do not have permission to do that."],
      [404, "That item no longer exists. Pull down to refresh."],
      [409, "Someone else changed this first. Pull down to refresh and try again."],
      [429, "Too many attempts. Wait a moment and try again."],
      [500, "The server had a problem. Try again in a moment."],
      [503, "The server had a problem. Try again in a moment."],
    ])("%i", (status, expected) => {
      expect(toUserMessage(httpError(status), FALLBACK)).toBe(expected);
    });

    it("falls back to the caller's wording for an unmapped 4xx with no body", () => {
      expect(toUserMessage(httpError(418), FALLBACK)).toBe(FALLBACK);
    });
  });

  describe("connectivity — the common case in a warehouse", () => {
    it("names the connection when the request never reached the server", () => {
      const err = { isAxiosError: true, message: "Network Error", response: undefined };
      expect(toUserMessage(err, FALLBACK)).toBe(
        "No connection to the server. Check your Wi-Fi and try again.",
      );
    });

    it("distinguishes a timeout from being offline", () => {
      const err = { isAxiosError: true, code: "ECONNABORTED", message: "timeout of 15000ms exceeded" };
      expect(toUserMessage(err, FALLBACK)).toBe(
        "The request timed out. Check your connection and try again.",
      );
    });
  });

  describe("degenerate input", () => {
    it.each([
      ["null", null],
      ["undefined", undefined],
      ["a string", "something went wrong"],
      ["a number", 42],
      ["an empty object", {}],
    ])("falls back for %s", (_label, value) => {
      expect(toUserMessage(value, FALLBACK)).toBe(FALLBACK);
    });

    it("falls back when the body is an empty error string", () => {
      expect(toUserMessage(httpError(400, { error: "   " }), FALLBACK)).toBe(FALLBACK);
    });

    it("always returns a non-empty string", () => {
      for (const value of [null, undefined, {}, new Error(""), httpError(400)]) {
        expect(toUserMessage(value, FALLBACK).length).toBeGreaterThan(0);
      }
    });
  });
});
