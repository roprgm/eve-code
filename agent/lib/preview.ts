const previewAttemptsMax = 20;
const previewRetryDelayMs = 500;

function getAbortError(signal: AbortSignal): Error {
  if (signal.reason instanceof Error) return signal.reason;
  return new Error("Preview start was aborted.");
}

async function waitForRetry(signal?: AbortSignal): Promise<void> {
  if (!signal) {
    await new Promise((resolve) => setTimeout(resolve, previewRetryDelayMs));
    return;
  }
  if (signal.aborted) throw getAbortError(signal);
  await new Promise<void>((resolve, reject) => {
    const onAbort = () => {
      clearTimeout(timeout);
      reject(getAbortError(signal));
    };
    const timeout = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, previewRetryDelayMs);
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

export async function waitForPreview(
  url: string,
  port: number,
  signal?: AbortSignal,
): Promise<void> {
  for (let attempt = 0; attempt < previewAttemptsMax; attempt++) {
    const response = await fetch(url, { signal }).catch((error: unknown) => {
      if (signal?.aborted && signal.reason instanceof Error) throw signal.reason;
      if (signal?.aborted) throw error;
      return undefined;
    });
    if (response && response.status !== 403 && response.status !== 502) return;
    await waitForRetry(signal);
  }
  throw new Error(
    `Preview is not publicly reachable on port ${port}. Configure the server to listen on 0.0.0.0 and allow the public sandbox hostname, then call start_dev again. For Vite, set server: { host: "0.0.0.0", allowedHosts: true }.`,
  );
}
