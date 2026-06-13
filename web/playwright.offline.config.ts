/**
 * Playwright configuration for the PWA offline suite (§10 Offline Doctrine).
 *
 * IMPORTANT: This suite runs against the BUILT app, not the dev server.
 * Run `yarn build` before `yarn test:e2e:offline`.
 *
 * Static server: `npx @quasar/cli serve dist/spa --history --port 9100`
 * - History-mode fallback so /resume serves index.html (SPA routing)
 * - No dev-server HMR → service worker registers and controls the client
 *   exactly as it does in production (skipWaiting + clientsClaim)
 * - Port 9100 avoids collisions with the dev-server suite (port 9000)
 *
 * No baselines: these tests assert behaviour, not pixels.
 * No retries: SW state is deterministic; a failure should surface immediately.
 *
 * DO NOT touch playwright.config.ts or its baselines (normal dev-server suite).
 */
import { defineConfig, devices } from '@playwright/test';

const OFFLINE_PORT = 9100;
const BASE_URL = `http://localhost:${OFFLINE_PORT}`;

export default defineConfig({
  testDir: './test/e2e-offline',
  testMatch: '**/*.spec.ts',

  // Stop on first failure in CI — SW failures are rarely flaky, always real.
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,

  reporter: process.env.CI
    ? [['dot'], ['junit', { outputFile: 'test-results/offline-junit.xml' }]]
    : [['list']],

  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    // SW activation + precache install can take a few seconds on first load.
    actionTimeout: 30_000,
    navigationTimeout: 30_000,
  },

  projects: [
    {
      name: 'chromium',
      // Use standard Desktop Chrome; no special SW flags needed — Chromium
      // supports service workers on localhost without HTTPS.
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    // @quasar/cli global `serve` command: SPA history fallback, zero extra deps.
    // npx resolves the already-installed package locally; downloads on first CI run.
    command: `npx @quasar/cli serve dist/spa --history --port ${OFFLINE_PORT} --silent`,
    url: BASE_URL,
    // Never reuse — we always want a fresh server pointing at the latest build.
    reuseExistingServer: false,
    // 120s (matches playwright.config.ts): npx cold-downloads @quasar/cli on
    // first CI/container run, which alone can exceed 30s.
    timeout: 120_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
