export const colors = {
  primary: "#3B82F6",
  primaryDark: "#2563EB",
  success: "#22C55E",
  warning: "#F59E0B",
  destructive: "#EF4444",
  background: {
    dark: "#0F172A",
    light: "#FFFFFF",
  },
  surface: {
    dark: "#1E293B",
    light: "#F8FAFC",
  },
  text: {
    primary: {
      dark: "#F8FAFC",
      light: "#0F172A",
    },
    secondary: {
      dark: "#94A3B8",
      light: "#64748B",
    },
    muted: {
      dark: "#64748B",
      light: "#94A3B8",
    },
  },
  border: {
    dark: "#334155",
    light: "#E2E8F0",
  },
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
  "4xl": 40,
} as const;

export const fontSizes = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  "2xl": 24,
  "3xl": 28,
  "4xl": 32,
} as const;

export const fontWeights = {
  normal: "400" as const,
  medium: "500" as const,
  semibold: "600" as const,
  bold: "700" as const,
};

export const radii = {
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
} as const;

export const hitSlop = {
  top: 8,
  bottom: 8,
  left: 8,
  right: 8,
};

export const minTouchSize = 44;
