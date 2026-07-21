import type { ThemeDescriptor } from "@pierre/theming";
import { createThemeCollection } from "@pierre/theming";

export function createTheme(theme: ThemeDescriptor): ThemeDescriptor {
  return theme;
}

async function loadPierreDarkTheme() {
  const { default: theme } = await import("@pierre/theme/pierre-dark");
  return theme;
}

export const pierreThemes = createThemeCollection({
  themes: [{ colorScheme: "dark", load: loadPierreDarkTheme, name: "pierre-dark" }],
});

export const shikiThemes = createThemeCollection({ themes: [] });
