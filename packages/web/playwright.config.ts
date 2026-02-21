import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30000,
  use: {
    baseURL: "http://localhost:1460",
    headless: true,
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "npx vite",
    port: 1460,
    reuseExistingServer: true,
  },
});
