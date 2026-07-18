import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  type TouchableOpacityProps,
} from "react-native";
import { clsx } from "clsx";

type ButtonVariant = "primary" | "secondary" | "destructive" | "ghost" | "outline";
type ButtonSize = "sm" | "md" | "lg" | "xl";

interface ButtonProps extends TouchableOpacityProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  title: string;
}

const variantStyles: Record<ButtonVariant, { container: string; text: string }> = {
  primary: {
    container: "bg-primary active:bg-primary/80",
    text: "text-primary-foreground",
  },
  secondary: {
    container: "bg-secondary active:bg-secondary/80",
    text: "text-secondary-foreground",
  },
  destructive: {
    container: "bg-destructive active:bg-destructive/80",
    text: "text-destructive-foreground",
  },
  ghost: {
    container: "bg-transparent active:bg-muted/30",
    text: "text-foreground",
  },
  outline: {
    container: "bg-transparent border border-border active:bg-muted/30",
    text: "text-foreground",
  },
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "px-3 py-2 min-h-[36px]",
  md: "px-4 py-3 min-h-[44px]",
  lg: "px-6 py-4 min-h-[52px]",
  xl: "px-8 py-5 min-h-[60px]",
};

const textSizeStyles: Record<ButtonSize, string> = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-lg",
  xl: "text-xl",
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  title,
  className,
  ...props
}: ButtonProps) {
  const v = variantStyles[variant];
  const s = sizeStyles[size];
  const ts = textSizeStyles[size];

  return (
    <TouchableOpacity
      disabled={disabled || loading}
      className={clsx(
        "flex-row items-center justify-center rounded-lg",
        s,
        v.container,
        disabled && "opacity-50",
        className
      )}
      activeOpacity={0.7}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          className={clsx("mr-2", v.text)}
          size="small"
        />
      ) : null}
      <Text
        className={clsx(
          "font-semibold text-center",
          ts,
          v.text,
          loading && "ml-2"
        )}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
}
