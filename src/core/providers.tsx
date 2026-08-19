import type { ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./query-client";
import { NetworkProvider } from "@/infrastructure/network/detector";

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <NetworkProvider>
        {children}
      </NetworkProvider>
    </QueryClientProvider>
  );
}
