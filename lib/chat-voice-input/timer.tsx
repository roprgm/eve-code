import { useEffect, useRef } from "react";

import { useChatVoiceInput } from "./chat-voice-input";

export function ChatVoiceInputTimer() {
  const { stream } = useChatVoiceInput();
  const timeRef = useRef<HTMLTimeElement>(null);

  useEffect(() => {
    const time = timeRef.current;
    if (!stream || !time) return;
    const clock = time;
    const startedAt = performance.now();

    function update(): void {
      const elapsed = Math.floor((performance.now() - startedAt) / 1_000);
      clock.textContent = `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, "0")}`;
    }

    update();
    const interval = window.setInterval(update, 250);
    return () => window.clearInterval(interval);
  }, [stream]);

  if (!stream) return null;
  return (
    <time className="w-9 text-right text-sm text-muted-foreground tabular-nums" ref={timeRef}>
      0:00
    </time>
  );
}
