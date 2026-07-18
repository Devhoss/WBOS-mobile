import { createContext, useEffect, useState, type ReactNode } from "react";
import NetInfo from "@react-native-community/netinfo";
import type { NetworkState } from "./types";

export const NetworkContext = createContext<NetworkState | null>(null);

const initialState: NetworkState = {
  isConnected: true,
  status: "online",
  type: null,
  isInternetReachable: null,
};

interface NetworkProviderProps {
  children: ReactNode;
}

export function NetworkProvider({ children }: NetworkProviderProps) {
  const [networkState, setNetworkState] = useState<NetworkState>(initialState);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setNetworkState({
        isConnected: state.isConnected ?? false,
        status: state.isConnected ? "online" : "offline",
        type: state.type ?? null,
        isInternetReachable: state.isInternetReachable ?? null,
      });
    });

    return () => unsubscribe();
  }, []);

  return (
    <NetworkContext.Provider value={networkState}>
      {children}
    </NetworkContext.Provider>
  );
}
