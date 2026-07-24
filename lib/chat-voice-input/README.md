# Chat Voice Input

Chat Voice Input adds live microphone transcription to a React composer. It streams
24 kHz PCM audio to Vercel AI Gateway, writes transcript deltas into a controlled
value, and includes a microphone button, waveform, timer, and error state. It does
not create or persist audio files.

## Usage

Use the default component for the standard controls:

```tsx
import ChatVoiceInput from "@/lib/chat-voice-input";

<ChatVoiceInput
  disabled={disabled}
  onValueChange={setValue}
  value={value}
/>;
```

Use the compound components when the layout needs customization:

```tsx
import ChatVoiceInput, { useChatVoiceInput } from "@/lib/chat-voice-input";

<ChatVoiceInput.Provider
  disabled={disabled}
  onValueChange={setValue}
  value={value}
>
  <ChatVoiceInput.Error />
  <ChatVoiceInput.Waveform />
  <ChatVoiceInput.Timer />
  <ChatVoiceInput.Button />
</ChatVoiceInput.Provider>;
```

`useChatVoiceInput` exposes the current status, transcript, media stream, and
`start`/`stop` actions for custom controls. Every component is also available as a
named export.

## Server

The browser expects `POST /eve/v1/transcription` to return a short-lived AI Gateway
token. Pass application-specific configuration to the server-only helper:

```ts
import { createTranscriptionTokenResponse } from "@/lib/chat-voice-input/server";

return createTranscriptionTokenResponse({
  apiKey: process.env.TRANSCRIPTION_AI_GATEWAY_API_KEY,
});
```

When `apiKey` is omitted, the AI Gateway provider uses its standard authentication:
`AI_GATEWAY_API_KEY`, then Vercel OIDC.
