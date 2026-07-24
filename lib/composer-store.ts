import { create } from "zustand";

import { DEFAULT_MODEL_ID, type ModelId } from "@/lib/models";

type ComposerStore = {
  readonly draft: string;
  readonly selectedModel: ModelId;
  readonly setDraft: (value: string) => void;
  readonly setSelectedModel: (model: ModelId) => void;
};

export const useComposerStore = create<ComposerStore>()((set) => ({
  draft: "",
  selectedModel: DEFAULT_MODEL_ID,
  setDraft: (draft) => set({ draft }),
  setSelectedModel: (selectedModel) => set({ selectedModel }),
}));
