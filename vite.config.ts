import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const rootDirectory = fileURLToPath(new URL(".", import.meta.url));
const pierreShiki = fileURLToPath(new URL("./lib/pierre-shiki.ts", import.meta.url));
const pierreThemes = fileURLToPath(new URL("./lib/pierre-themes.ts", import.meta.url));

export default defineConfig({
  root: "app",
  envDir: "..",
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      "/eve": {
        changeOrigin: true,
        target: "http://127.0.0.1:4879",
      },
    },
  },
  resolve: {
    alias: [
      { find: "shiki/wasm", replacement: pierreShiki },
      { find: /^shiki$/, replacement: pierreShiki },
      { find: "@pierre/theming/themes", replacement: pierreThemes },
      { find: "@", replacement: rootDirectory },
    ],
  },
  optimizeDeps: {
    exclude: ["@pierre/diffs"],
    include: ["lru_map"],
  },
  build: {
    outDir: "../dist",
    emptyOutDir: true,
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: "react",
              test: /node_modules\/(?:react|react-dom|react-router|scheduler)\//,
            },
            {
              name: "session-runtime",
              test: /node_modules\/(?:convex|eve)\//,
            },
          ],
        },
      },
    },
  },
});
