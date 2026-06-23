import path from "path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    // Port is set programmatically in server.ts (local_port + 1).
    // Do NOT set port here — it conflicts with the Hono proxy setup.
    strictPort: false,
    hmr: false,
    ws: false,
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
