import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:4173/HEALTHNOTE-by-KELBRICTECH/",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run build && npm run preview -- --host 127.0.0.1",
    url: "http://127.0.0.1:4173/HEALTHNOTE-by-KELBRICTECH/",
    reuseExistingServer: true,
    timeout: 120_000,
  },
  projects: [
    { name: "mobile-360x640", use: { ...devices["Desktop Chrome"], viewport: { width: 360, height: 640 } } },
    { name: "mobile-390x844", use: { ...devices["Desktop Chrome"], viewport: { width: 390, height: 844 } } },
    { name: "mobile-412x915", use: { ...devices["Desktop Chrome"], viewport: { width: 412, height: 915 } } },
  ],
});
