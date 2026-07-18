import { View, type ViewProps } from "react-native";
import { clsx } from "clsx";

interface CardProps extends ViewProps {
  padded?: boolean;
}

export function Card({ padded = true, className, children, ...props }: CardProps) {
  return (
    <View
      className={clsx(
        "bg-card rounded-lg border border-border",
        padded && "p-4",
        className
      )}
      {...props}
    >
      {children}
    </View>
  );
}
