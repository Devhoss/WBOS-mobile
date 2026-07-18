export type Platform = "android" | "ios" | "web";

export interface DeviceInfo {
  platform: Platform;
  isAndroid: boolean;
  isIOS: boolean;
  isWeb: boolean;
  isTablet: boolean;
  screenWidth: number;
  screenHeight: number;
  hasNotch: boolean;
}
