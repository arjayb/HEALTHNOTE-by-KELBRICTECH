import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Standalone HEALTHNOTE HTML-first PoC.
// No CDN externals: everything ships bundled from node_modules/public.
export default defineConfig({
  plugins: [react()],
  base: "/HEALTHNOTE-by-KELBRICTECH/",
  server: {
    host: true,
    port: 5173,
  },
  build: {
    outDir: "dist",
    sourcemap: false,
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./tests/setup.js",
    include: ["tests/**/*.test.js"],
  },
});
