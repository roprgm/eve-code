import type { EveMessageInputRequest } from "eve/client";
import { useId } from "react";

import { Button } from "@/components/ui/button";

type InputRequestProps = {
  readonly disabled: boolean;
  readonly onSelect: (optionId: string) => void;
  readonly request: EveMessageInputRequest;
};

export function InputRequest({ disabled, onSelect, request }: InputRequestProps) {
  const titleId = useId();
  const options = request.options ?? [];

  return (
    <section
      aria-labelledby={titleId}
      className="my-4 rounded-xl border bg-card p-4 text-card-foreground"
    >
      <h2 className="font-medium leading-6" id={titleId}>
        {request.prompt}
      </h2>
      {options.length > 0 && (
        <div className="mt-3 flex w-full flex-wrap gap-2">
          {options.map((option) => (
            <Button
              disabled={disabled}
              className="h-auto min-h-6 max-w-full whitespace-normal py-1 text-left"
              key={option.id}
              onClick={() => onSelect(option.id)}
              size="sm"
              variant={option.style === "primary" ? "default" : "outline"}
            >
              {option.label}
            </Button>
          ))}
        </div>
      )}
    </section>
  );
}
