import axios, {
  AxiosError,
  InternalAxiosRequestConfig,
} from "axios";
import { apiConfig } from "./config";
import { getTokens, clearTokens } from "../auth/token-storage";

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
      await clearTokens();
    }
    return Promise.reject(error);
  }
);

export { client };
export default client;
