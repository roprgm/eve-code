import { ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getMenuAnchorStyle, MenuContent, MenuItem } from "@/components/ui/menu";
import { useComposerStore } from "@/lib/composer-store";
import { MODEL_OPTIONS } from "@/lib/models";

type ModelSelectorProps = {
  readonly disabled: boolean;
  readonly hidden?: boolean;
};

export function ModelSelector({ disabled, hidden }: ModelSelectorProps) {
  const selectedModel = useComposerStore((state) => state.selectedModel);
  const setSelectedModel = useComposerStore((state) => state.setSelectedModel);
  const model = MODEL_OPTIONS.find((option) => option.value === selectedModel) ?? MODEL_OPTIONS[0];
  const menuId = "composer-model-menu";

  return (
    <>
      <Button
        aria-label="Select model"
        className="gap-1 px-2 font-normal"
        disabled={disabled}
        hidden={hidden}
        popoverTarget={menuId}
        style={getMenuAnchorStyle(menuId)}
        variant="ghost"
      >
        <span>{model.label}</span>
        <ChevronDown aria-hidden="true" className="ml-0.5 size-3.5 text-muted-foreground" />
      </Button>
      <MenuContent
        className="w-36 [position-area:top_span-right] [position-try-fallbacks:flip-block]"
        id={menuId}
        side="top"
      >
        {MODEL_OPTIONS.map((option) => (
          <MenuItem
            className="text-sm"
            key={option.value}
            onClick={() => setSelectedModel(option.value)}
            popoverTarget={menuId}
          >
            {option.label}
          </MenuItem>
        ))}
      </MenuContent>
    </>
  );
}
