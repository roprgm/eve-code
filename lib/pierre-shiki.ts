import {
  createBundledHighlighter,
  createCssVariablesTheme,
  createSingletonShorthands,
  getTokenStyleObject,
  stringifyTokenStyle,
} from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";
import { createOnigurumaEngine } from "shiki/engine/oniguruma";
import { bundledLanguages } from "shiki/langs";

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
