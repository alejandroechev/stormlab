import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: ["react", "react-dom"],
  },
  server: {
    port: 1460, strictPort: true,
  },
  test: {
    exclude: ["e2e/**", "node_modules/**"],
    passWithNoTests: true,
  },
});
