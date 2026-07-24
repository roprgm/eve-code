export const MODEL_OPTIONS = [
  { label: "GPT 5.6 Terra", value: "openai/gpt-5.6-terra" },
  { label: "GPT 5.6 Luna", value: "openai/gpt-5.6-luna" },
  { label: "Claude Sonnet 5", value: "anthropic/claude-sonnet-5" },
  { label: "Claude Opus 5", value: "anthropic/claude-opus-5" },
  { label: "Gemini 3.6 Flash", value: "google/gemini-3.6-flash" },
  { label: "Deepseek V4 Flash", value: "deepseek/deepseek-v4-flash" },
  { label: "Kimi 2.7", value: "moonshotai/kimi-k2.7-code" },
] as const;

export type ModelId = (typeof MODEL_OPTIONS)[number]["value"];

export const DEFAULT_MODEL_ID: ModelId = MODEL_OPTIONS[0].value;
export const MODEL_HEADER = "x-eve-model";

export function isModelId(value: unknown): value is ModelId {
  return MODEL_OPTIONS.some((model) => model.value === value);
}
