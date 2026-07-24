import type { EveMessageInputRequest, InputResponse } from "eve/client";
import { Check } from "lucide-react";
import { useId } from "react";

import { Button } from "@/components/ui/button";

type InputRequestProps = {
  readonly disabled: boolean;
  readonly onSelect: (optionId: string) => void;
  readonly request: EveMessageInputRequest;
  readonly response?: InputResponse;
};

export function InputRequest({ disabled, onSelect, request, response }: InputRequestProps) {
  const titleId = useId();
  const options = request.options ?? [];
  const answered = response !== undefined;

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
          {options.map((option) => {
            const selected = response?.optionId === option.id;
            let variant: "default" | "outline" = "outline";
            if (selected || (!answered && option.style === "primary")) variant = "default";
            return (
              <Button
                aria-pressed={selected}
                className="h-auto min-h-6 max-w-full whitespace-normal py-1 text-left disabled:opacity-100"
                disabled={disabled || answered}
                key={option.id}
                onClick={() => onSelect(option.id)}
                size="sm"
                variant={variant}
              >
                {selected && <Check aria-hidden="true" />}
                {option.label}
              </Button>
            );
          })}
        </div>
      )}
      {response?.text && (
        <p className="mt-3 rounded-md bg-muted px-3 py-2 text-sm">
          <span className="mr-2 text-muted-foreground">Answer</span>
          {response.text}
        </p>
      )}
    </section>
  );
}
