import { createBrowserRouter } from "react-router";

import { App } from "./app";
import { AppErrorBoundary } from "./error-boundary";
import { HomePage } from "./home-page";
import { NotFoundPage } from "./not-found";
import { ProjectPage } from "./project-page";

export const router = createBrowserRouter([
  {
    Component: App,
    ErrorBoundary: AppErrorBoundary,
    children: [
      { index: true, Component: HomePage },
      { path: "/p/:projectId", Component: ProjectPage },
      { path: "*", Component: NotFoundPage },
    ],
    path: "/",
  },
]);
