import { isRouteErrorResponse, useNavigate, useRouteError } from "react-router";

import { Button } from "@/components/ui/button";

function getErrorMessage(error: unknown): string {
  if (isRouteErrorResponse(error)) {
    return error.status === 404 ? "The requested page could not be found." : error.statusText;
  }
  if (import.meta.env.DEV && error instanceof Error) return error.message;
  return "An unexpected error occurred.";
}

export function AppErrorBoundary() {
  const error = useRouteError();
  const navigate = useNavigate();

  return (
    <main className="flex h-dvh items-center justify-center bg-background p-6 text-center text-foreground">
      <div>
        <h1 className="font-medium">eve-code couldn’t load</h1>
        <p className="mt-2 text-muted-foreground">{getErrorMessage(error)}</p>
        <Button className="mt-4" onClick={() => void navigate(0)} variant="outline">
          Reload
        </Button>
      </div>
    </main>
  );
}
