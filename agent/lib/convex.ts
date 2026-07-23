import { ConvexHttpClient } from "convex/browser";

export function getConvexClient(): ConvexHttpClient {
  const convexUrl = process.env.VITE_CONVEX_URL;
  if (!convexUrl) throw new Error("Convex is not configured.");
  return new ConvexHttpClient(convexUrl);
}
