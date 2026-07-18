import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const rootDirectory = fileURLToPath(new URL(".", import.meta.url));

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
    alias: {
      "@": rootDirectory,
    },
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
              name: "chat-runtime",
              test: /node_modules\/(?:convex|eve)\//,
            },
          ],
        },
      },
    },
  },
});
