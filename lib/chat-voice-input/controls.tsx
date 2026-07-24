import { LoaderCircle, Mic, Square } from "lucide-react";

import { type ChatVoiceInputStatus, useChatVoiceInput } from "./chat-voice-input";

const buttonClassName =
  "inline-flex size-8 shrink-0 items-center justify-center rounded-full transition-colors duration-150 outline-none hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0";

function buttonLabel(state: ChatVoiceInputStatus, error: string): string {
  if (state === "recording") return "Stop voice input";
  if (state === "loading") return "Loading voice input";
  if (error) return "Retry voice input";
  return "Start voice input";
}

function ButtonIcon({ state }: { readonly state: ChatVoiceInputStatus }) {
  if (state === "loading") {
    return <LoaderCircle aria-hidden="true" className="size-4 motion-safe:animate-spin" />;
  }
  if (state === "recording") {
    return <Square aria-hidden="true" className="fill-current" />;
  }
  return <Mic aria-hidden="true" className="size-4" />;
}

export function ChatVoiceInputError() {
  const { error } = useChatVoiceInput();
  if (!error) return null;
  return (
    <span className="min-w-0 truncate text-right text-sm text-destructive" role="alert">
      {error}
    </span>
  );
}

export function ChatVoiceInputButton() {
  const { disabled, error, start, status, stop } = useChatVoiceInput();
  const isLoading = status === "loading";
  const className = status === "recording" ? `${buttonClassName} bg-accent` : buttonClassName;
  const label = buttonLabel(status, error);
  const title = error || undefined;
  const buttonDisabled = disabled || isLoading;

  function onClick(): void {
    if (status === "recording") {
      void stop();
      return;
    }
    void start();
  }

  return (
    <button
      aria-busy={isLoading}
      aria-label={label}
      className={className}
      disabled={buttonDisabled}
      onClick={onClick}
      title={title}
      type="button"
    >
      <ButtonIcon state={status} />
    </button>
  );
}
