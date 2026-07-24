import { defineChannel, POST } from "eve/channels";

import { createTranscriptionTokenResponse } from "@/lib/chat-voice-input/server";

export default defineChannel({
  routes: [POST("/eve/v1/transcription", createTranscriptionTokenResponse)],
});
