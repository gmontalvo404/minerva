import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The Python server keeps owning the data and the API; Vite only serves the UI
// in development and proxies everything else to it.
const BACKEND = process.env.MINERVA_BACKEND ?? "http://localhost:8123";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": BACKEND,
      "/finance": BACKEND,
    },
  },
  build: {
    outDir: "dist",
    sourcemap: true,
  },
});
