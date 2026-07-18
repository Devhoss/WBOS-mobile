import { View } from "react-native";
import { clsx } from "clsx";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <View
      className={clsx("bg-muted rounded-md animate-pulse", className)}
    />
  );
}

export function SkeletonCard({ className }: SkeletonProps) {
  return (
    <View className={clsx("bg-card border border-border rounded-xl p-4", className)}>
      <View className="flex-row items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-lg" />
        <View className="flex-1 gap-2">
          <Skeleton className="h-5 w-3/5" />
          <Skeleton className="h-4 w-2/5" />
        </View>
        <Skeleton className="h-8 w-10 rounded-full" />
      </View>
    </View>
  );
}

export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <View className="gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </View>
  );
}
