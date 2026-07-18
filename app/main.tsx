import { ConvexQueryClient } from "@convex-dev/react-query";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router/dom";

import "./globals.css";
import { router } from "./router";

const root = document.getElementById("root");
if (!root) throw new Error("Root element not found.");

const convexUrl = import.meta.env.VITE_CONVEX_URL;
const QUERY_CACHE_TIME_MS = 10 * 60 * 1_000;

if (!convexUrl) {
  throw new Error("VITE_CONVEX_URL is not set");
}

const convexClient = new ConvexReactClient(convexUrl);
const convexQueryClient = new ConvexQueryClient(convexClient);
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: QUERY_CACHE_TIME_MS,
      queryFn: convexQueryClient.queryFn(),
      queryKeyHashFn: convexQueryClient.hashFn(),
      staleTime: Number.POSITIVE_INFINITY,
      throwOnError: true,
    },
  },
});

convexQueryClient.connect(queryClient);

createRoot(root).render(
  <StrictMode>
    <ConvexProvider client={convexClient}>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </ConvexProvider>
  </StrictMode>,
);
