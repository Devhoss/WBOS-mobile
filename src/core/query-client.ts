import { QueryClient } from "@tanstack/react-query";
import { QUERY_CONFIG } from "@/shared/constants/config";

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: QUERY_CONFIG.defaultStaleTime,
        gcTime: QUERY_CONFIG.defaultCacheTime,
        retry: QUERY_CONFIG.retryCount,
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
      },
      mutations: {
        retry: 1,
      },
    },
  });
}
