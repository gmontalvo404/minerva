import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The Python server keeps owning the data and the API; Vite only serves the UI
// in development and proxies everything else to it.
const BACKEND = process.env.MINERVA_BACKEND ?? "http://localhost:8123";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // These keys are prefixes, so each one ends in a slash on purpose: "/finance"
    // would also swallow /finances/cashflow, the address of the Finances
    // section, and hand back the built index.html from dist instead of letting
    // Vite serve the live one.
    proxy: {
      // changeOrigin: the Python server validates the Host header against its
      // own address; without this the proxy would forward "localhost:5173".
      "/api/": { target: BACKEND, changeOrigin: true },
      "/finance/": { target: BACKEND, changeOrigin: true },
      // Where the demo dataset and the shared catalogs are read from.
      "/server/bundled/": { target: BACKEND, changeOrigin: true },
    },
  },
  build: {
    outDir: "dist",
    sourcemap: true,
  },
});
