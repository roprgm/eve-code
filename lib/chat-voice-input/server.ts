import { createGateway } from "@ai-sdk/gateway";

const model = "openai/gpt-realtime-whisper";
const headers = { "Cache-Control": "no-store" };
const apiKey = process.env.TRANSCRIPTION_AI_GATEWAY_API_KEY;
const transcription = apiKey ? createGateway({ apiKey }).experimental_transcription : undefined;

export async function createTranscriptionTokenResponse(): Promise<Response> {
  if (!transcription) {
    return Response.json({ error: "Voice input is unavailable." }, { headers, status: 503 });
  }

  try {
    const { token } = await transcription.getToken({ model });
    return Response.json({ model, token }, { headers });
  } catch (error) {
    console.error("Could not create transcription token", error);
    return Response.json({ error: "Voice input is unavailable." }, { headers, status: 503 });
  }
}
