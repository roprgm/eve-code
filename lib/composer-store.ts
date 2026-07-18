import { create } from "zustand";

type ComposerStore = {
  readonly draft: string;
  readonly setDraft: (value: string) => void;
};

export const useComposerStore = create<ComposerStore>()((set) => ({
  draft: "",
  setDraft: (draft) => set({ draft }),
}));
