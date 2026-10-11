import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/ui",
  fullyParallel: false,
  use: {
    baseURL: "http://127.0.0.1:3000",
    ...devices["Desktop Chrome"],
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
      ? {
          executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
          args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
        }
      : {},
  },
  webServer: {
    command: "npm run dev -- --hostname 127.0.0.1 --port 3000",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: !process.env.CI,
  },
  reporter: "list",
});
