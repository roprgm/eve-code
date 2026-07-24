import { Mic, Square } from "lucide-react";

import { useChatVoiceInput } from "./chat-voice-input";

const buttonClassName =
  "inline-flex size-8 shrink-0 items-center justify-center rounded-full transition-colors outline-none hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0";

export function ChatVoiceInputError() {
  const { error } = useChatVoiceInput();
  if (!error) return null;
  return (
    <span className="min-w-0 truncate text-right text-sm text-destructive" role="alert">
      {error}
    </span>
  );
}

export function ChatVoiceInputStartButton() {
  const { disabled, error, start, status } = useChatVoiceInput();
  if (status === "recording") return null;
  const label = error ? "Retry voice input" : "Start voice input";
  const title = error || undefined;
  return (
    <button
      aria-label={label}
      className={buttonClassName}
      disabled={disabled || status === "busy"}
      onClick={() => void start()}
      title={title}
      type="button"
    >
      <Mic aria-hidden="true" className="size-4" />
    </button>
  );
}

export function ChatVoiceInputStopButton() {
  const { disabled, status, stop } = useChatVoiceInput();
  if (status !== "recording") return null;
  return (
    <button
      aria-label="Stop voice input"
      className={`${buttonClassName} bg-accent`}
      disabled={disabled}
      onClick={() => void stop()}
      type="button"
    >
      <Square aria-hidden="true" className="fill-current" />
    </button>
  );
}
