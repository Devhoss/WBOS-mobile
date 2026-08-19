import { QueryClient } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import { QUERY_CONFIG } from "@/shared/constants/config";

/**
 * Retrying a request the server has already refused cannot succeed, and it
 * costs the picker the one thing they have least of: time before they know.
 *
 * Mutations defaulted to `retry: 1`, which applied to every status. With a
 * 15-second timeout that meant a scan reported failure after 30 seconds — long
 * enough for the worker to have moved several items down the shelf, so the red
 * flash named a product they were no longer holding. A 409 over-pick was
 * re-sent to be refused a second time for the same price.
 *
 * Only transport failures and 5xx are worth a second attempt. Both are safe to
 * repeat: pick actions carry a `clientEventId` the server deduplicates on, and
 * the line-quantity mutation sets an absolute value rather than a delta.
 */
function isWorthRetrying(error: unknown): boolean {
  const status = (error as AxiosError | undefined)?.response?.status;
  if (status === undefined) return true; // no response: timeout or no network
  return status >= 500;
}

const MAX_ATTEMPTS = 2;

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: QUERY_CONFIG.defaultStaleTime,
        gcTime: QUERY_CONFIG.defaultCacheTime,
        retry: (failureCount, error) =>
          failureCount < QUERY_CONFIG.retryCount && isWorthRetrying(error),
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
      },
      mutations: {
        retry: (failureCount, error) =>
          failureCount < MAX_ATTEMPTS - 1 && isWorthRetrying(error),
      },
    },
  });
}

/**
 * A single instance, shared with the Axios interceptor.
 *
 * Sign-out cleared SecureStore and the auth store but left the cache intact, so
 * the next worker to sign in on the same handset saw the previous worker's task
 * list and unread notifications painted from cache while the refetch was still
 * in flight. On a shared warehouse device that is the normal case, not an edge
 * one.
 */
export const queryClient = createQueryClient();

export function clearCachedData(): void {
  queryClient.clear();
}
