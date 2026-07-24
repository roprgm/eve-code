import { useEffect, useRef } from "react";

export function Waveform({ stream }: { readonly stream: MediaStream }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timeRef = useRef<HTMLTimeElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const time = timeRef.current;
    const drawing = canvas?.getContext("2d");
    if (!canvas || !time || !drawing) return;

    const element = canvas;
    const clock = time;
    const context = drawing;
    const audio = new AudioContext();
    const analyser = audio.createAnalyser();
    const source = audio.createMediaStreamSource(stream);
    const samples = new Float32Array(analyser.fftSize);
    const levels: number[] = [];
    const color = getComputedStyle(element).color;
    let elapsed = -1;
    let frame = 0;

    analyser.fftSize = 256;
    source.connect(analyser);
    void audio.resume().catch(() => undefined);

    function draw(): void {
      const ratio = window.devicePixelRatio || 1;
      const width = Math.max(1, Math.round(element.clientWidth * ratio));
      const height = Math.max(1, Math.round(element.clientHeight * ratio));
      if (element.width !== width || element.height !== height) {
        element.width = width;
        element.height = height;
      }

      analyser.getFloatTimeDomainData(samples);
      let level = 0;
      for (const sample of samples) level = Math.max(level, Math.abs(sample));

      const columns = Math.ceil(width / ratio);
      levels.push(level);
      levels.splice(0, Math.max(0, levels.length - columns));
      context.clearRect(0, 0, width, height);
      context.fillStyle = color;
      for (let index = 0; index < levels.length; index += 1) {
        const barHeight = Math.max(1, (levels[index] ?? 0) * height * 0.9);
        context.fillRect(
          (columns - levels.length + index) * ratio,
          (height - barHeight) / 2,
          ratio,
          barHeight,
        );
      }

      const nextElapsed = Math.floor(audio.currentTime);
      if (nextElapsed !== elapsed) {
        elapsed = nextElapsed;
        clock.textContent = `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, "0")}`;
      }
      frame = requestAnimationFrame(draw);
    }

    frame = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frame);
      source.disconnect();
      void audio.close();
    };
  }, [stream]);

  return (
    <>
      <canvas
        aria-label="Live audio waveform"
        className="h-8 min-w-0 flex-1 text-foreground"
        ref={canvasRef}
        role="img"
      />
      <time className="w-9 text-right text-sm text-muted-foreground tabular-nums" ref={timeRef}>
        0:00
      </time>
    </>
  );
}
