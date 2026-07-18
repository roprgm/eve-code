import { useNavigate } from "react-router";

import { Button } from "@/components/ui/button";

export function NotFoundPage({ title = "Page not found" }: { readonly title?: string }) {
  const navigate = useNavigate();

  return (
    <main className="flex min-w-0 flex-1 items-center justify-center p-6 text-center">
      <div>
        <h1 className="font-medium">{title}</h1>
        <Button className="mt-4" onClick={() => void navigate("/")} variant="outline">
          Start a new project
        </Button>
      </div>
    </main>
  );
}
