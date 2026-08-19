import axios, {
  AxiosError,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";
import { apiConfig } from "./config";
import { getTokens, clearTokens } from "../auth/token-storage";
import { useAuthStore } from "../auth/store";
import { clearCachedData } from "@/core/query-client";

const client = axios.create({
  timeout: apiConfig.timeout,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  /**
   * The API must never redirect us. It used to: sixteen route handlers
   * authenticated without passing request headers, which made the server
   * `redirect("/sign-in")` on an expired session — a 307. The redirect was
   * followed and the HTML sign-in page came back as a 200, so
   * `deliverShipment` resolved and the driver was told a delivery had been
   * recorded that never happened.
   *
   * `maxRedirects` only applies to Axios's Node adapter. React Native uses the
   * XHR adapter, where the platform follows redirects before Axios ever sees
   * them, so this setting does nothing here — it is set for correctness on any
   * future Node-side use and for the intent it records. The guard that actually
   * holds on device is the HTML check in the response interceptor below.
   */
  maxRedirects: 0,
});

client.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const tokens = await getTokens();
    if (tokens?.token) {
      config.headers.Authorization = `Bearer ${tokens.token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/** An HTML body where JSON was expected means we were served a page, not data. */
function isHtml(response: AxiosResponse): boolean {
  const contentType = String(response.headers?.["content-type"] ?? "");
  if (contentType.includes("application/json")) return false;
  if (contentType.includes("text/html")) return true;
  return typeof response.data === "string" && response.data.trimStart().startsWith("<");
}

function signOutForExpiredSession() {
  const store = useAuthStore.getState();
  store.setAuthMessage("Your session has expired. Please sign in again.");
  store.clear();
  // Otherwise the next person to sign in on this handset sees the last one's
  // work painted from cache while their own is still loading.
  clearCachedData();
}

client.interceptors.response.use(
  (response) => {
    // A 2xx carrying a page rather than data is not a success. Converting it to
    // a rejection is what stops a failed write from repainting as a completed
    // one; every caller already reports rejections through `toUserMessage`.
    if (isHtml(response)) {
      console.warn(
        `[api] ${response.config?.url ?? "request"} returned HTML with status ${response.status}; treating as a failed request.`
      );
      clearTokens().catch(() => {});
      signOutForExpiredSession();
      return Promise.reject(
        new axios.AxiosError(
          "Session expired",
          "ERR_HTML_RESPONSE",
          response.config,
          response.request,
          { ...response, status: 401, data: { error: "Your session has expired. Please sign in again." } }
        )
      );
    }
    return response;
  },
  async (error: AxiosError) => {
    const status = error.response?.status;

    // maxRedirects: 0 turns a redirect into an error rather than a followed
    // request. Treat it the same as an expired session — it is what one is.
    const isRedirect = typeof status === "number" && status >= 300 && status < 400;

    if (status === 401 || isRedirect) {
      console.warn(
        `[api] Received ${status} — session expired or invalid; signing out.`
      );
      await clearTokens();
      signOutForExpiredSession();
    }
    return Promise.reject(error);
  }
);

export { client };
export default client;
