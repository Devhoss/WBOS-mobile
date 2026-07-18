import { View, ScrollView, type ViewProps } from "react-native";
import { clsx } from "clsx";
import { SafeArea } from "./safe-area";

interface PageShellProps extends ViewProps {
  scroll?: boolean;
  padded?: boolean;
}

export function PageShell({
  scroll = true,
  padded = true,
  className,
  children,
  ...props
}: PageShellProps) {
  const content = (
    <View
      className={clsx("flex-1", padded && "px-4", className)}
      {...props}
    >
      {children}
    </View>
  );

  return (
    <SafeArea>
      {scroll ? (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {content}
        </ScrollView>
      ) : (
        content
      )}
    </SafeArea>
  );
}
