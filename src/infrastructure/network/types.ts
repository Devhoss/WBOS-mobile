export type NetworkStatus = "online" | "offline";

export interface NetworkState {
  isConnected: boolean;
  status: NetworkStatus;
  type: string | null;
  isInternetReachable: boolean | null;
}
