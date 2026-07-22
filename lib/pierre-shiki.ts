import { languageAliasNames, languageNames } from "@shikijs/langs";
import {
  createBundledHighlighter,
  createCssVariablesTheme,
  createSingletonShorthands,
  getTokenStyleObject,
  stringifyTokenStyle,
} from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";

function getPlainLanguageLoader(name: string) {
  return async () => ({
    default: [{ name, patterns: [], repository: {}, scopeName: `text.${name}` }],
  });
}

function createOnigurumaEngine() {
  return createJavaScriptRegexEngine();
}

const bundledLanguages = Object.fromEntries(
  [...languageNames, ...languageAliasNames].map((name) => [name, getPlainLanguageLoader(name)]),
);
Object.assign(bundledLanguages, {
  css: () => import("@shikijs/langs/css"),
  dockerfile: () => import("@shikijs/langs/dockerfile"),
  go: () => import("@shikijs/langs/go"),
  html: () => import("@shikijs/langs/html"),
  javascript: () => import("@shikijs/langs/javascript"),
  json: () => import("@shikijs/langs/json"),
  jsonc: () => import("@shikijs/langs/jsonc"),
  jsx: () => import("@shikijs/langs/jsx"),
  markdown: () => import("@shikijs/langs/markdown"),
  python: () => import("@shikijs/langs/python"),
  rust: () => import("@shikijs/langs/rust"),
  sql: () => import("@shikijs/langs/sql"),
  toml: () => import("@shikijs/langs/toml"),
  tsx: () => import("@shikijs/langs/tsx"),
  typescript: () => import("@shikijs/langs/typescript"),
  yaml: () => import("@shikijs/langs/yaml"),
  yml: () => import("@shikijs/langs/yml"),
  zsh: () => import("@shikijs/langs/zsh"),
});

const createHighlighter = createBundledHighlighter({
  engine: createJavaScriptRegexEngine,
  langs: bundledLanguages,
  themes: {},
});
const { codeToHtml } = createSingletonShorthands(createHighlighter);

export {
  bundledLanguages,
  codeToHtml,
  createCssVariablesTheme,
  createHighlighter,
  createJavaScriptRegexEngine,
  createOnigurumaEngine,
  getTokenStyleObject,
  stringifyTokenStyle,
};
