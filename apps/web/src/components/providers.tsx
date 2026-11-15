"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Analytics } from "@vercel/analytics/next";
import { useState, type ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false }
        }
      })
  );
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Analytics beforeSend={(event) => ({ ...event, url: event.url.split("?")[0] })} />
    </QueryClientProvider>
  );
}
