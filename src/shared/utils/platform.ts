import { Platform, Dimensions } from "react-native";

export const isAndroid = Platform.OS === "android";
export const isIOS = Platform.OS === "ios";
export const isWeb = Platform.OS === "web";

export const screenWidth = Dimensions.get("window").width;
export const screenHeight = Dimensions.get("window").height;

export function isSmallDevice(): boolean {
  return screenWidth < 375;
}

export function isTablet(): boolean {
  return screenWidth >= 768;
}
