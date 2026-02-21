import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 1460,
  },
  test: {
    exclude: ["e2e/**", "node_modules/**"],
    passWithNoTests: true,
  },
});
