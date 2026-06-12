/**
 * Playwright configuration for kenzik.com smoke suite.
 *
 * Design decisions (see modernization-2026.md Phase 1 row):
 *
 * - Chromium-only: other browsers are nice-to-have but not Phase 1 scope.
 * - VITE_RESUME_YAML_PATH=/data/example.yml: data/kenzik.yml is a gitignored
 *   secret; all screenshots / assertions are scoped to example.yml content.
 * - VITE_POWER_ON_DELAY_MS=500: fast redirect so smoke tests don't sit on the
 *   landing page.  The single full-boot choreography test intercepts the
 *   redirect via page.route() so it can observe the full ~3.5s animation.
 * - snapshotDir under test/e2e/__screenshots__: baselines committed to repo.
 */
import { defineConfig, devices } from '@playwright/test';

const PORT = 9000;
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './test/e2e',
  testMatch: '**/*.spec.ts',

  // Fail fast in CI; keep going locally
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // Serial execution: the boot test occupies the server for ~4s; parallel
  // runs can race the 1.8s crt-smack animation window in easter-egg tests.
  workers: 1,

  reporter: process.env.CI
    ? [['dot'], ['junit', { outputFile: 'test-results/junit.xml' }]]
    : [['list']],

  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    // Allow a few seconds for the terminal to initialise after navigation
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },

  // Screenshot baselines storage.
  // {platform} in the template produces per-OS files:
  //   dark-home-darwin.png  ← macOS dev baseline (local gate)
  //   dark-home-linux.png   ← Ubuntu CI baseline (CI gate)
  // Both are committed and compared at 0-diff tolerance; cross-platform
  // font-antialiasing differences no longer cause false failures.
  snapshotDir: './test/e2e/__screenshots__',
  snapshotPathTemplate: '{snapshotDir}/{testFileDir}/{testFileName}-snapshots/{arg}-{platform}{ext}',

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    // VITE_RESUME_YAML_PATH: use the committed example file (never kenzik.yml)
    // VITE_POWER_ON_DELAY_MS: low so most tests redirect quickly to /resume
    command: 'VITE_RESUME_YAML_PATH=/data/example.yml VITE_POWER_ON_DELAY_MS=500 yarn dev',
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
