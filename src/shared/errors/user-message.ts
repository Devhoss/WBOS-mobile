/**
 * Turns whatever a failed request threw into something worth showing a picker
 * standing in a warehouse.
 *
 * Two things must not happen. A mutation must never fail silently — the
 * warehouse screens used `try { ... } finally { setBusy(false) }` with no
 * `catch`, so a failed Deliver looked exactly like a successful one: the
 * spinner stopped and nothing else changed. And the message must never be raw
 * transport detail: "Request failed with status code 500" or an Axios stack
 * tells the user nothing and looks broken.
 *
 * The server's own `BusinessError` messages ARE written for users ("Only issued
 * credit notes can be cancelled."), so those are preferred when present. The
 * API returns them in two shapes depending on the route — `{ error: "..." }`
 * and `{ error: { message: "..." } }` — and both are read here.
 */

type MaybeAxiosError = {
  isAxiosError?: boolean;
  code?: string;
  message?: string;
  response?: {
    status?: number;
    data?: unknown;
  };
};

/** Long enough to be a sentence, short enough for a toast. */
const MAX_LENGTH = 200;

/** Transport noise that must never reach a user, however it is dressed up. */
const TRANSPORT_NOISE =
  /^(request failed with status code|network error|timeout of|socket hang up|econn|read econn|aborted$)/i;

function readServerMessage(data: unknown): string | null {
  if (typeof data === "string") {
    // Some error pages return HTML; that is not a message.
    const trimmed = data.trim();
    if (!trimmed || trimmed.startsWith("<")) return null;
    return trimmed;
  }

  if (!data || typeof data !== "object") return null;
  const body = data as Record<string, unknown>;

  // `{ error: "Shipment not found" }`
  if (typeof body.error === "string" && body.error.trim()) return body.error.trim();

  // `{ error: { message: "..." } }`
  if (body.error && typeof body.error === "object") {
    const nested = (body.error as Record<string, unknown>).message;
    if (typeof nested === "string" && nested.trim()) return nested.trim();
  }

  // `{ message: "..." }`
  if (typeof body.message === "string" && body.message.trim()) return body.message.trim();

  return null;
}

function messageForStatus(status: number, fallback: string): string {
  if (status === 401) return "Your session has expired. Please sign in again.";
  if (status >= 300 && status < 400) return "Your session has expired. Please sign in again.";
  if (status === 403) return "You do not have permission to do that.";
  if (status === 404) return "That item no longer exists. Pull down to refresh.";
  if (status === 409) return "Someone else changed this first. Pull down to refresh and try again.";
  if (status === 429) return "Too many attempts. Wait a moment and try again.";
  if (status >= 500) return "The server had a problem. Try again in a moment.";
  return fallback;
}

export function toUserMessage(error: unknown, fallback: string): string {
  const err = error as MaybeAxiosError | null | undefined;

  if (!err || typeof err !== "object") return fallback;

  // No response at all: the phone could not reach the server. This is the
  // common case in a warehouse and deserves its own wording.
  if (!err.response) {
    if (err.code === "ECONNABORTED" || /timeout/i.test(err.message ?? "")) {
      return "The request timed out. Check your connection and try again.";
    }
    if (err.isAxiosError || /network/i.test(err.message ?? "")) {
      return "No connection to the server. Check your Wi-Fi and try again.";
    }
    return fallback;
  }

  const status = err.response.status ?? 0;
  const serverMessage = readServerMessage(err.response.data);

  if (serverMessage && !TRANSPORT_NOISE.test(serverMessage)) {
    return serverMessage.length > MAX_LENGTH
      ? `${serverMessage.slice(0, MAX_LENGTH - 1).trimEnd()}…`
      : serverMessage;
  }

  return messageForStatus(status, fallback);
}
