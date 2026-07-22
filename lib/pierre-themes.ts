import type { ThemeDescriptor } from "@pierre/theming";
import { createThemeCollection } from "@pierre/theming";

export function createTheme(theme: ThemeDescriptor): ThemeDescriptor {
  return theme;
}

async function loadPierreDarkSoftTheme() {
  const { default: theme } = await import("@pierre/theme/pierre-dark-soft");
  return theme;
}

export const pierreThemes = createThemeCollection({
  themes: [{ colorScheme: "dark", load: loadPierreDarkSoftTheme, name: "pierre-dark-soft" }],
});
export const shikiThemes = createThemeCollection({ themes: [] });
