import { SafeAreaView } from "react-native-safe-area-context";
import { clsx } from "clsx";
import type { ViewProps } from "react-native";

interface SafeAreaProps extends ViewProps {
  edges?: ("top" | "bottom" | "left" | "right")[];
}

export function SafeArea({
  edges = ["top", "bottom"],
  className,
  children,
  ...props
}: SafeAreaProps) {
  return (
    <SafeAreaView
      edges={edges}
      className={clsx("flex-1 bg-background", className)}
      {...props}
    >
      {children}
    </SafeAreaView>
  );
}
