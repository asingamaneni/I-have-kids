import { defineConfig, devices } from "@playwright/test";
import { tmpdir } from "node:os";
import { join } from "node:path";

const runData = join(tmpdir(), `learning-worktable-e2e-${process.pid}`);

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "retain-on-failure"
  },
  webServer: {
    command: "pnpm dev",
    url: "http://127.0.0.1:3000",
    timeout: 120_000,
    reuseExistingServer: false,
    env: {
      LEARNING_WORKTABLE_DB: join(runData, "learning.db"),
      LEARNING_WORKTABLE_ARTIFACTS: join(runData, "artifacts")
    }
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } }
  ]
});
