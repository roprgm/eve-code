import { Mic, Square } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Waveform } from "@/components/composer/waveform";
import { Button } from "@/components/ui/button";
import { startTranscription, type Transcription } from "@/lib/transcription";

type AudioControlsProps = {
  readonly disabled: boolean;
  readonly onChange: (value: string) => void;
  readonly value: string;
};

type Recording = Transcription | "busy" | "error" | undefined;

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
      <Button
        aria-label="Stop voice input"
        className="size-8 rounded-full bg-accent"
        disabled={disabled}
        onClick={onStop}
        size="icon-sm"
        variant="ghost"
      >
        <Square aria-hidden="true" className="fill-current" />
      </Button>
    );
  }

  const isBusy = recording === "busy";
  const isUnavailable = recording === "error";
  const label = isUnavailable ? "Retry voice input" : "Start voice input";
  const title = isUnavailable ? "Voice input is unavailable." : undefined;
  const buttonDisabled = disabled || isBusy;
  return (
    <Button
      aria-label={label}
      className="size-8 rounded-full"
      disabled={buttonDisabled}
      onClick={onStart}
      size="icon-sm"
      title={title}
      variant="ghost"
    >
      <Mic aria-hidden="true" className="size-4" />
    </Button>
  );
}

export function AudioControls({ disabled, onChange, value }: AudioControlsProps) {
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
