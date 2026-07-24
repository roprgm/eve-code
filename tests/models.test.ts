import { describe, expect, it } from "vitest";

import { DEFAULT_MODEL_ID, isModelId, MODEL_OPTIONS } from "@/lib/models";

describe("models", () => {
  it("keeps the default in the supported options", () => {
    expect(isModelId(DEFAULT_MODEL_ID)).toBe(true);
    expect(MODEL_OPTIONS.map((model) => model.value)).toContain(DEFAULT_MODEL_ID);
    expect(isModelId("unsupported/model")).toBe(false);
  });
});
