import { createBrowserRouter } from "react-router";

import { App } from "./app";
import { AppErrorBoundary } from "./error-boundary";
import { HomePage } from "./home-page";
import { NotFoundPage } from "./not-found";

function SessionRouteLoading() {
  return null;
}

export const router = createBrowserRouter([
  {
    Component: App,
    ErrorBoundary: AppErrorBoundary,
    children: [
      { index: true, Component: HomePage },
      {
        HydrateFallback: SessionRouteLoading,
        lazy: () => import("./session-page"),
        path: "/s/:sessionId",
      },
      { path: "*", Component: NotFoundPage },
    ],
    path: "/",
  },
]);
