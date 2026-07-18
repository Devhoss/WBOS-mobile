import { Text as RNText, type TextProps } from "react-native";
import { clsx } from "clsx";

type TextVariant = "h1" | "h2" | "h3" | "body" | "body-sm" | "caption" | "label";

interface AppTextProps extends TextProps {
  variant?: TextVariant;
  muted?: boolean;
}

const variantStyles: Record<TextVariant, string> = {
  h1: "text-3xl font-bold text-foreground",
  h2: "text-2xl font-bold text-foreground",
  h3: "text-xl font-semibold text-foreground",
  body: "text-base text-foreground",
  "body-sm": "text-sm text-foreground",
  caption: "text-xs text-muted-foreground",
  label: "text-sm font-medium text-foreground",
};

export function AppText({
  variant = "body",
  muted = false,
  className,
  children,
  ...props
}: AppTextProps) {
  return (
    <RNText
      className={clsx(
        variantStyles[variant],
        muted && "text-muted-foreground",
        className
      )}
      {...props}
    >
      {children}
    </RNText>
  );
}
