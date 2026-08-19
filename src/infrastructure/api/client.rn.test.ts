import { useAuthStore } from "@/infrastructure/auth/store";
import { queryClient } from "@/core/query-client";
import client from "@/infrastructure/api/client";
import * as SecureStore from "expo-secure-store";
import { toUserMessage } from "@/shared/errors/user-message";

/**
 * Expired-session handling, at the layer where it actually failed.
 *
 * Sixteen API routes authenticated without passing request headers, so the
 * server answered an expired session with `redirect("/sign-in")` — a 307. The
 * platform follows redirects, so the app received `200 text/html` (the sign-in
 * page) and ran its success path: `deliverShipment` resolved, the cache was
 * invalidated, and the driver was told a delivery had been recorded that never
 * happened.
 *
 * The server no longer redirects, but the client must not be able to read a
 * page as data even if it ever does again. `maxRedirects` is a Node-adapter
 * option and does nothing under React Native's XHR adapter, so the guard that
 * matters on device is the content-type check tested here.
 */

function htmlResponse(status = 200) {
  return {
    status,
    headers: { "content-type": "text/html; charset=utf-8" },
    data: "<!DOCTYPE html><html><body>Sign in</body></html>",
    config: { url: "/api/v1/shipments/x/deliver" },
    request: {},
  };
}

function jsonResponse(data: unknown) {
  return {
    status: 200,
    headers: { "content-type": "application/json" },
    data,
    config: { url: "/api/v1/tasks" },
    request: {},
  };
}

/** Run the response interceptor exactly as Axios would. */
function runSuccess(response: unknown) {
  const handlers = (client.interceptors.response as unknown as {
    handlers: Array<{ fulfilled: (r: unknown) => unknown }>;
  }).handlers;
  return handlers[0].fulfilled(response);
}

function runFailure(error: unknown) {
  const handlers = (client.interceptors.response as unknown as {
    handlers: Array<{ rejected: (e: unknown) => unknown }>;
  }).handlers;
  return handlers[0].rejected(error);
}

describe("an HTML body is never a successful response", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({ status: "authenticated", user: null, authMessage: null });
    queryClient.setQueryData(["tasks", "today"], [{ id: "task-1" }]);
  });

  it("rejects a 200 that carries the sign-in page", async () => {
    // The exact shape of the bug: a write endpoint answering 200 with HTML.
    await expect(runSuccess(htmlResponse())).rejects.toBeDefined();
  });

  it("signs the user out rather than reporting success", async () => {
    await expect(runSuccess(htmlResponse())).rejects.toBeDefined();
    expect(useAuthStore.getState().status).toBe("unauthenticated");
    expect(useAuthStore.getState().authMessage).toMatch(/session has expired/i);
  });

  it("clears the stored token", async () => {
    await expect(runSuccess(htmlResponse())).rejects.toBeDefined();
    // Asserted through SecureStore rather than the wrapper, so this covers the
    // token really being removed rather than a helper being called.
    await Promise.resolve();
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith("auth_token");
  });

  it("empties the query cache so the next user sees nothing of this one", async () => {
    expect(queryClient.getQueryData(["tasks", "today"])).toBeDefined();
    await expect(runSuccess(htmlResponse())).rejects.toBeDefined();
    expect(queryClient.getQueryData(["tasks", "today"])).toBeUndefined();
  });

  it("surfaces a message a picker can read, not transport detail", async () => {
    const rejection = await Promise.resolve(runSuccess(htmlResponse())).catch((e: unknown) => e);
    expect(toUserMessage(rejection, "fallback")).toMatch(/session has expired/i);
  });

  it("lets a genuine JSON response through untouched", () => {
    const ok = jsonResponse({ tasks: [] });
    expect(runSuccess(ok)).toBe(ok);
    expect(useAuthStore.getState().status).toBe("authenticated");
  });

  it("does not treat a JSON body that merely starts with a bracket as HTML", () => {
    const ok = jsonResponse([{ id: 1 }]);
    expect(runSuccess(ok)).toBe(ok);
  });
});

describe("error statuses that mean the session is gone", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({ status: "authenticated", user: null, authMessage: null });
  });

  it("signs out on 401", async () => {
    await expect(runFailure({ response: { status: 401 } })).rejects.toBeDefined();
    expect(useAuthStore.getState().status).toBe("unauthenticated");
  });

  it("signs out on a redirect, which is what an expired session used to look like", async () => {
    await expect(runFailure({ response: { status: 307 } })).rejects.toBeDefined();
    expect(useAuthStore.getState().status).toBe("unauthenticated");
  });

  it("leaves the session alone for an ordinary business failure", async () => {
    await expect(
      runFailure({ response: { status: 409, data: { error: "Someone else changed this first." } } }),
    ).rejects.toBeDefined();
    expect(useAuthStore.getState().status).toBe("authenticated");
  });

  it("leaves the session alone when the phone simply has no connection", async () => {
    await expect(runFailure({ isAxiosError: true, message: "Network Error" })).rejects.toBeDefined();
    expect(useAuthStore.getState().status).toBe("authenticated");
  });
});
