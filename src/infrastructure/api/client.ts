import axios, {
  AxiosError,
  InternalAxiosRequestConfig,
} from "axios";
import { apiConfig } from "./config";
import { getTokens, clearTokens } from "../auth/token-storage";
import { useAuthStore } from "../auth/store";

const client = axios.create({
  timeout: apiConfig.timeout,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
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

client.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      console.warn("[api] Received 401 — session expired or invalid; signing out.");
      await clearTokens();
      const store = useAuthStore.getState();
      store.setAuthMessage("Your session has expired. Please sign in again.");
      store.clear();
    }
    return Promise.reject(error);
  }
);

export { client };
export default client;
