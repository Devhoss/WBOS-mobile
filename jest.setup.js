/* eslint-disable @typescript-eslint/no-require-imports */
// RNTL v14 registers its own matchers on import; no extend-expect entry point.

// Native modules the app touches at import time. Each is stubbed rather than
// mocked per test so a component can be rendered without pulling in a device.
jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
}));

jest.mock("expo-haptics", () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Medium: "medium" },
  NotificationFeedbackType: { Error: "error" },
}));

jest.mock("expo-audio", () => ({
  createAudioPlayer: jest.fn(() => ({ play: jest.fn(), remove: jest.fn(), volume: 1, loop: false })),
  setAudioModeAsync: jest.fn(async () => undefined),
  setIsAudioActiveAsync: jest.fn(async () => undefined),
}));

jest.mock("expo-constants", () => ({
  __esModule: true,
  default: {
    expoConfig: {
      version: "0.1.0",
      extra: {
        apiUrl: "https://example.test",
        authUrl: "https://example.test",
        appEnv: "development",
      },
    },
    deviceName: "test-device",
  },
}));

// VisionCamera reaches for a native TurboModule at import time, which cannot
// exist under Jest. Stubbed so anything importing the scanner barrel is
// testable; camera behaviour itself is not covered here.
jest.mock("react-native-vision-camera", () => ({
  Camera: () => null,
  useCameraDevice: () => ({ id: "back" }),
  useCameraPermission: () => ({ hasPermission: true, requestPermission: jest.fn(async () => true) }),
}));

jest.mock("react-native-vision-camera-barcode-scanner", () => ({
  useBarcodeScannerOutput: () => ({}),
}));

// Screens read safe-area insets at render time; there is no device to ask.
jest.mock("react-native-safe-area-context", () => {
  const inset = { top: 0, right: 0, bottom: 0, left: 0 };
  return {
    SafeAreaProvider: ({ children }) => children,
    SafeAreaView: ({ children }) => children,
    useSafeAreaInsets: () => inset,
    useSafeAreaFrame: () => ({ x: 0, y: 0, width: 390, height: 844 }),
  };
});

global.__DEV__ = true;

// React 19 warns "the current testing environment is not configured to support
// act(...)" without this, and state updates that land outside an act scope can
// then fail intermittently — two of these tests failed on one run and passed on
// the next, which is worse than failing.
global.IS_REACT_ACT_ENVIRONMENT = true;
