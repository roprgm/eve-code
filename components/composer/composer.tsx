import { ArrowUp, Square } from "lucide-react";
import { type FormEvent, type KeyboardEvent, useEffect, useRef } from "react";

import { AudioControls } from "@/components/composer/audio-controls";
import { Button } from "@/components/ui/button";
import { useComposerStore } from "@/lib/composer-store";

type ComposerProps = {
  readonly disabled?: boolean;
  readonly isGenerating?: boolean;
  readonly onSend: (message: string) => void;
  readonly onStop?: () => void;
};

function SubmitButton({
  disabled,
  isGenerating,
  onStop,
}: {
  readonly disabled: boolean;
  readonly isGenerating: boolean;
  readonly onStop?: () => void;
}) {
  if (isGenerating) {
    return (
      <Button
        aria-label="Stop generating"
        className="ml-auto size-8 rounded-full"
        disabled={!onStop}
        onClick={onStop}
        size="icon-sm"
      >
        <Square aria-hidden="true" className="fill-current" />
      </Button>
    );
  }

  return (
    <Button
      aria-label="Send message"
      className="ml-auto size-8 rounded-full"
      disabled={disabled}
      size="icon-sm"
      type="submit"
    >
      <ArrowUp aria-hidden="true" className="size-[18px]" />
    </Button>
  );
}

function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>): void {
  if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;

  event.preventDefault();
  event.currentTarget.form?.requestSubmit();
}

export function Composer({
  disabled = false,
  isGenerating = false,
  onSend,
  onStop,
}: ComposerProps) {
  const value = useComposerStore((state) => state.draft);
  const onChange = useComposerStore((state) => state.setDraft);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!disabled) textareaRef.current?.focus();
  }, [disabled]);

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const message = value.trim();
    if (!message || disabled || isGenerating) return;
    onChange("");
    onSend(message);
  }

  const audioDisabled = disabled || isGenerating;
  const submitDisabled = disabled || !value.trim();

  return (
    <div className="shrink-0 px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-6">
      <form
        className="mx-auto max-w-3xl rounded-2xl border border-border/40 bg-muted p-2 transition-colors focus-within:border-ring/50"
        onSubmit={handleSubmit}
      >
        <label className="sr-only" htmlFor="message-input">
          Message eve-code
        </label>
        <textarea
          autoComplete="off"
          className="max-h-48 min-h-16 w-full resize-none overflow-y-auto bg-transparent px-2 py-1 outline-none [field-sizing:content] placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
          disabled={disabled}
          id="message-input"
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Message eve-code"
          ref={textareaRef}
          rows={1}
          value={value}
        />
        <div className="flex items-center gap-1 pt-1">
          <AudioControls disabled={audioDisabled} onChange={onChange} value={value} />
          <SubmitButton disabled={submitDisabled} isGenerating={isGenerating} onStop={onStop} />
        </div>
      </form>
    </div>
  );
}
