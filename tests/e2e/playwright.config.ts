import { defineConfig } from "@playwright/test";

const baseURL = "http://127.0.0.1:3000";
const healthURL = `${baseURL}/api/health`;

export default defineConfig({
  testDir: __dirname,
  testMatch: /.*\.spec\.ts/,
  use: {
    baseURL,
  },
  webServer: {
    command: "npm run dev -- --hostname 127.0.0.1 --port 3000",
    url: healthURL,
    reuseExistingServer: true,
    timeout: 120000,
  },
});
