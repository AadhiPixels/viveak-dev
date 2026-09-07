import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end configuration. Runs against the production build:
 *
 *   npm run build
 *   npx playwright test
 *
 * The web server block reuses a server already listening on port 3400
 * (for example one started with `npm run start -- --port 3400`) and
 * otherwise starts one itself from the existing build.
 *
 * Only Chromium is installed in this environment (PLAYWRIGHT_BROWSERS_PATH),
 * so there is a single project. WebGL runs on SwiftShader (software) so the
 * hero canvas can be exercised headlessly.
 */
export const BASE_URL = "http://localhost:3400";

export const CHROMIUM_ARGS = [
  "--use-angle=swiftshader",
  "--enable-unsafe-swiftshader",
  "--ignore-gpu-blocklist",
];

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  // Software WebGL is CPU-heavy; keep concurrency modest on small machines.
  workers: process.env.PW_WORKERS ? Number(process.env.PW_WORKERS) : 2,
  timeout: 120_000,
  expect: { timeout: 15_000 },
  reporter: [["list"], ["html", { outputFolder: "playwright-report", open: "never" }]],
  outputDir: "test-results",
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
    launchOptions: { args: CHROMIUM_ARGS },
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
      },
    },
  ],
  webServer: {
    command: "npm run start -- --port 3400",
    url: `${BASE_URL}/`,
    reuseExistingServer: true,
    timeout: 120_000,
    stdout: "ignore",
    stderr: "pipe",
  },
});
