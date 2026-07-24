import { Mic, Square } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { startTranscription, type Transcription } from "./transcription";
import { Waveform } from "./waveform";

type ChatVoiceInputProps = {
  readonly disabled: boolean;
  readonly onChange: (value: string) => void;
  readonly value: string;
};

type Recording = Transcription | "busy" | "error" | undefined;

const buttonClassName =
  "inline-flex size-8 shrink-0 items-center justify-center rounded-full transition-colors outline-none hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0";

function message(prefix: string, transcript: string): string {
  return [prefix, transcript].filter(Boolean).join(" ").trim();
}

function RecordingStatus({ recording }: { readonly recording: Recording }) {
  if (recording === "error") {
    return (
      <span className="min-w-0 truncate text-right text-sm text-destructive" role="alert">
        Voice input is unavailable.
      </span>
    );
  }
  if (typeof recording !== "object") return null;
  return <Waveform stream={recording.stream} />;
}

function RecordButton({
  disabled,
  onStart,
  onStop,
  recording,
}: {
  readonly disabled: boolean;
  readonly onStart: () => void;
  readonly onStop: () => void;
  readonly recording: Recording;
}) {
  if (typeof recording === "object") {
    return (
      <button
        aria-label="Stop voice input"
        className={`${buttonClassName} bg-accent`}
        disabled={disabled}
        onClick={onStop}
        type="button"
      >
        <Square aria-hidden="true" className="fill-current" />
      </button>
    );
  }

  const isBusy = recording === "busy";
  const isUnavailable = recording === "error";
  const label = isUnavailable ? "Retry voice input" : "Start voice input";
  const title = isUnavailable ? "Voice input is unavailable." : undefined;
  const buttonDisabled = disabled || isBusy;
  return (
    <button
      aria-label={label}
      className={buttonClassName}
      disabled={buttonDisabled}
      onClick={onStart}
      title={title}
      type="button"
    >
      <Mic aria-hidden="true" className="size-4" />
    </button>
  );
}

export function ChatVoiceInput({ disabled, onChange, value }: ChatVoiceInputProps) {
  const [recording, setRecording] = useState<Recording>();
  const controller = useRef<AbortController | undefined>(undefined);
  const prefix = useRef("");
  const transcript = useRef("");

  useEffect(
    () => () => {
      controller.current?.abort();
      controller.current = undefined;
    },
    [],
  );

  useEffect(() => {
    if (!disabled || !controller.current) return;
    const activeController = controller.current;
    controller.current = undefined;
    activeController.abort();
    setRecording(undefined);
  }, [disabled]);

  function fail(activeController: AbortController): void {
    if (controller.current !== activeController) return;
    activeController.abort();
    controller.current = undefined;
    setRecording("error");
  }

  async function start(): Promise<void> {
    if (controller.current) return;
    const activeController = new AbortController();
    controller.current = activeController;
    prefix.current = value.trim();
    transcript.current = "";
    setRecording("busy");

    try {
      const live = await startTranscription((delta) => {
        transcript.current += delta;
        onChange(message(prefix.current, transcript.current));
      }, activeController.signal);
      activeController.signal.throwIfAborted();
      setRecording(live);
      void live.text.catch(() => fail(activeController));
    } catch {
      fail(activeController);
    }
  }

  async function stop(): Promise<void> {
    if (typeof recording !== "object") return;
    const live = recording;
    const activeController = controller.current;
    if (!activeController) return;
    setRecording("busy");

    try {
      live.stop();
      const finalTranscript = (await live.text).trim() || transcript.current;
      const nextValue = message(prefix.current, finalTranscript);
      if (controller.current !== activeController) return;
      activeController.abort();
      controller.current = undefined;
      setRecording(undefined);
      onChange(nextValue);
    } catch {
      fail(activeController);
    }
  }

  return (
    <div className="flex min-w-0 flex-1 items-center justify-end gap-1">
      <RecordingStatus recording={recording} />
      <RecordButton
        disabled={disabled}
        onStart={() => void start()}
        onStop={() => void stop()}
        recording={recording}
      />
    </div>
  );
}
