import { defineConfig } from "vite";

export default defineConfig({
  server: {
    host: true,
    allowedHosts: true,
    hmr: { protocol: "wss", clientPort: 443 },
  },
});
