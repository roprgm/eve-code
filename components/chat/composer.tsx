import { ArrowUp, Square } from "lucide-react";
import { type KeyboardEvent, type SubmitEvent, useEffect, useRef } from "react";

import { ModelSelector } from "@/components/chat/model-selector";
import { Button } from "@/components/ui/button";
import ChatVoiceInput, { useChatVoiceInput } from "@/lib/chat-voice-input";
import { useComposerStore } from "@/lib/composer-store";

type ComposerProps = {
  readonly disabled: boolean;
  readonly isGenerating: boolean;
  readonly onSend: (message: string) => void;
  readonly onStop?: () => void;
};

type TextInputProps = {
  readonly disabled: boolean;
  readonly onValueChange: (value: string) => void;
  readonly value: string;
};

type SubmitButtonProps = Pick<ComposerProps, "disabled" | "isGenerating" | "onStop">;

function SecondaryControls({ disabled }: { readonly disabled: boolean }) {
  const { status } = useChatVoiceInput();
  if (status === "recording") return null;
  return <ModelSelector disabled={disabled} />;
}

function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>): void {
  if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;

  event.preventDefault();
  event.currentTarget.form?.requestSubmit();
}

function TextInput({ disabled, onValueChange, value }: TextInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!disabled) textareaRef.current?.focus();
  }, [disabled]);

  return (
    <>
      <label className="sr-only" htmlFor="message-input">
        Do anything
      </label>
      <textarea
        id="message-input"
        className="max-h-48 min-h-16 w-full resize-none overflow-y-auto bg-transparent px-2 py-1 outline-none [field-sizing:content] placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
        autoComplete="off"
        disabled={disabled}
        onChange={(event) => onValueChange(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Do anything"
        ref={textareaRef}
        rows={1}
        value={value}
      />
    </>
  );
}

function SubmitButton({ disabled, isGenerating, onStop }: SubmitButtonProps) {
  if (isGenerating) {
    return (
      <Button
        aria-label="Stop generating"
        className="size-8 rounded-full"
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
      className="size-8 rounded-full"
      disabled={disabled}
      size="icon-sm"
      type="submit"
    >
      <ArrowUp aria-hidden="true" className="size-[18px]" />
    </Button>
  );
}

export function Composer({ disabled, isGenerating, onSend, onStop }: ComposerProps) {
  const value = useComposerStore((state) => state.draft);
  const onValueChange = useComposerStore((state) => state.setDraft);

  function handleSubmit(event: SubmitEvent<HTMLFormElement>): void {
    event.preventDefault();
    const message = value.trim();
    if (!message || disabled || isGenerating) return;
    onValueChange("");
    onSend(message);
  }

  const audioDisabled = disabled || isGenerating;
  const submitDisabled = disabled || !value.trim();

  return (
    <form
      className="mx-auto max-w-3xl rounded-2xl border border-border/40 bg-muted p-2 transition-colors focus-within:border-ring/50"
      onSubmit={handleSubmit}
    >
      <TextInput disabled={disabled} onValueChange={onValueChange} value={value} />
      <div className="flex min-w-0 items-center justify-end gap-1 pt-1">
        <ChatVoiceInput.Provider
          disabled={audioDisabled}
          onValueChange={onValueChange}
          value={value}
        >
          <ChatVoiceInput.Error />
          <ChatVoiceInput.Waveform />
          <ChatVoiceInput.Timer />
          <SecondaryControls disabled={disabled} />
          <div className="flex gap-1.5">
            <ChatVoiceInput.Button />
            <SubmitButton disabled={submitDisabled} isGenerating={isGenerating} onStop={onStop} />
          </div>
        </ChatVoiceInput.Provider>
      </div>
    </form>
  );
}
