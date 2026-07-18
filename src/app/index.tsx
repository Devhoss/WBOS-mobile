import { useEffect } from "react";
import { useRouter } from "expo-router";
import { useAuthStore } from "@/infrastructure/auth/store";
import { FullScreenLoading } from "@/design-system";

export default function IndexScreen() {
  const router = useRouter();
  const status = useAuthStore((s) => s.status);

  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/(app)/(home)");
    } else if (status === "unauthenticated") {
      router.replace("/(auth)/sign-in");
    }
  }, [status, router]);

  return <FullScreenLoading message="Loading..." />;
}
