import { defineConfig, devices } from "@playwright/test";

const testPort = Number(process.env.MEADOW_TEST_PORT ?? 4187);

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60000,
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${testPort}`,
    trace: "retain-on-failure",
  },
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: `npm run preview -- --port ${testPort} --strictPort`,
        url: `http://127.0.0.1:${testPort}`,
        reuseExistingServer: false,
      },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 1000 },
      },
    },
  ],
});
