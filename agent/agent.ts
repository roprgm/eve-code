import { defineAgent } from "eve";

export default defineAgent({
  model: "anthropic/claude-haiku-4.5",
  limits: {
    maxInputTokensPerSession: 2_000_000,
    maxOutputTokensPerSession: 100_000,
  },
});
