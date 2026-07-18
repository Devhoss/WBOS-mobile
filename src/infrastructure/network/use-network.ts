import { useContext } from "react";
import { NetworkContext } from "./detector";
import type { NetworkState } from "./types";

export function useNetwork(): NetworkState {
  const context = useContext(NetworkContext);
  if (!context) {
    return {
      isConnected: true,
      status: "online",
      type: null,
      isInternetReachable: null,
    };
  }
  return context;
}
