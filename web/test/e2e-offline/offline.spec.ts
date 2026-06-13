/**
 * PWA offline E2E suite — §10 Offline Doctrine.
 *
 * "The terminal works when the mainframe is down."
 *
 * Runs against the BUILT app served statically (see playwright.offline.config.ts).
 * Service worker lifecycle: skipWaiting() + clientsClaim() in sw.js means the
 * SW activates immediately on first registration and claims all open clients
 * without requiring a reload.
 *
 * Three focused tests:
 *   1. SW activates and claims the page (controller !== null after first load)
 *   2. Terminal renders correctly after going offline + reloading from SW cache
 *   3. No /games/** URLs are present in the workbox precache (§10: never precache)
 *
 * Playwright note: context.setOffline(true) emulates offline at the CDP
 * network layer — all network requests (from the page AND from the SW) fail.
 * Workbox's precache entries are already in cache, so the SW serves them
 * without touching the network.
 */
import { test, expect } from '@playwright/test';

// ── Test 1: Service Worker activates and claims the client ────────────────────

test('SW activates and claims the client on first load (skipWaiting + clientsClaim)', async ({ page }) => {
  await page.goto('/resume');

  // Wait for the SW to be active and claiming this client.
  // skipWaiting() → SW activates immediately (no wait for old SW to die).
  // clientsClaim() → active SW claims all existing open clients at once.
  // Both happen during the install+activate sequence triggered by first load.
  await page.waitForFunction(
    () =>
      navigator.serviceWorker.controller !== null &&
      navigator.serviceWorker.controller.state === 'activated',
    { timeout: 30_000 },
  );

  const info = await page.evaluate(() => ({
    state: navigator.serviceWorker.controller?.state,
    scriptURL: navigator.serviceWorker.controller?.scriptURL,
  }));

  expect(info.state).toBe('activated');
  // sw.js must be served from the same origin
  expect(info.scriptURL).toMatch(/localhost:9100\/sw\.js$/);
});

// ── Test 2: Terminal renders from SW cache when network is gone ───────────────

test('terminal renders after network goes offline (§10 — mainframe down)', async ({ page, context }) => {
  await page.goto('/resume');

  // Wait for SW to claim the client (precache install is complete by activation)
  await page.waitForFunction(
    () => navigator.serviceWorker.controller !== null,
    { timeout: 30_000 },
  );

  // Cut the network — all subsequent fetch() calls from page and SW will fail.
  await context.setOffline(true);

  try {
    // The SW intercepts the navigation and serves index.html from precache.
    // Assets (JS, CSS, fonts) are also served from precache — no network needed.
    await page.reload({ timeout: 30_000 });
  } finally {
    // Restore network so the browser context is left in a clean state.
    await context.setOffline(false);
  }

  // Terminal input must be visible — the full app shell rendered from cache.
  const input = page.locator('input[type="text"]').first();
  await expect(input).toBeVisible({ timeout: 30_000 });

  // At least one terminal output line must be visible (MOTD or boot output).
  await expect(
    page.locator('.terminal-output, .output-line, .history-entry').first(),
  ).toBeVisible({ timeout: 30_000 });
});

// ── Test 3: No games/** URLs in the workbox precache ─────────────────────────

test('no /games/** URLs in workbox precache (§10 — never precache 11 MB games bundle)', async ({ page }) => {
  await page.goto('/resume');

  // Ensure SW has activated and the precache install event has completed.
  // The precache populate happens during the SW install event, which finishes
  // before the SW activates — so controller !== null implies precache is done.
  await page.waitForFunction(
    () => navigator.serviceWorker.controller !== null,
    { timeout: 30_000 },
  );

  // Inspect the Cache Storage API from the page context.
  // Only check caches whose name contains "precache" — the workbox precache
  // cache.  The "games-cache" runtime cache is intentionally excluded (its
  // existence is fine; we only assert that games URLs are not in the precache).
  const hasGamesInPrecache = await page.evaluate(async () => {
    const names = await caches.keys();
    for (const name of names) {
      if (!name.includes('precache')) continue;
      const cache = await caches.open(name);
      const requests = await cache.keys();
      if (requests.some((r: Request) => r.url.includes('/games/'))) {
        return true;
      }
    }
    return false;
  });

  expect(hasGamesInPrecache).toBe(false);
});
