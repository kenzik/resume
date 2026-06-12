/**
 * Full boot choreography test — the one un-shortened timing verification.
 *
 * The webServer sets VITE_POWER_ON_DELAY_MS=500, which would redirect the
 * landing page to /resume at 500 ms.  This test intercepts that navigation
 * so the full ~3.5 s CSS animation sequence can be observed.
 *
 * Choreography from DESIGN_GUIDE.md §5.1 / DESIGN_GUIDE_2026-2.md §8.1:
 *   100 ms  → animationClass = 'powering-on' (power line ignites)
 *   3500 ms → animationClass = 'powered-on'  (phosphor settled)
 *
 * Reduced-motion variant ships in Phase 3.  Until then the e2e assertion is
 * marked expected-fail so the test slot exists but CI stays green.
 */
import { test, expect } from '@playwright/test';

test.describe('boot choreography', () => {
  test(
    'full boot: power-off → powering-on → powered-on in ~3.5s',
    async ({ page }) => {
      // Hold the redirect so we can observe the full animation sequence
      let releaseRedirect!: () => void;
      const redirectHeld = new Promise<void>((resolve) => {
        releaseRedirect = resolve;
      });

      await page.route('**/resume**', async (route) => {
        await redirectHeld;
        await route.continue();
      });

      await page.goto('/');

      // 1. Initial state: screen is "off"
      const container = page.locator('.crt-container').first();
      await expect(container).toHaveClass(/power-off/, { timeout: 2000 });

      // 2. Poll until powering-on class appears and capture performance.now()
      //    at that exact moment (in-page clock, immune to page-load latency).
      //    waitForFunction returns a JSHandle of the truthy return value.
      const poweringOnHandle = await page.waitForFunction(
        () => {
          const el = document.querySelector('.crt-container');
          return el?.classList.contains('powering-on') ? performance.now() : null;
        },
        undefined,
        { timeout: 1500 },
      );
      const poweringOnAt = (await poweringOnHandle.jsonValue()) as number;

      // 3. Poll until powered-on class appears and capture performance.now().
      //    Generous wall-clock timeout so CI runner slowness cannot flake this.
      //    This FAILS if powered-on never arrives (animation broken).
      //    The delta gate below FAILS if someone shortens the ritual.
      const poweredOnHandle = await page.waitForFunction(
        () => {
          const el = document.querySelector('.crt-container');
          return el?.classList.contains('powered-on') ? performance.now() : null;
        },
        undefined,
        { timeout: 15_000 },
      );
      const poweredOnAt = (await poweredOnHandle.jsonValue()) as number;

      // 4. Verify choreography duration via in-page delta.
      //    Both timestamps are performance.now() from the same page — the
      //    delta is the actual JS-clock duration of the ritual, unaffected by
      //    CI page-load latency or test-process overhead.
      //    Expected: powering-on → powered-on ≈ 3500 ms (DESIGN_GUIDE_2026-2.md §8.1)
      //    Window: 2500–5000 ms (±30% for JS event-loop jitter on CI)
      const delta = poweredOnAt - poweringOnAt;
      expect(
        delta,
        `powering-on→powered-on delta: ${delta.toFixed(0)} ms; expected 2500–5000 ms (DESIGN_GUIDE_2026-2.md §8.1)`,
      ).toBeGreaterThan(2500);
      expect(
        delta,
        `powering-on→powered-on delta: ${delta.toFixed(0)} ms; expected 2500–5000 ms (DESIGN_GUIDE_2026-2.md §8.1)`,
      ).toBeLessThan(5000);

      // Allow the redirect to proceed (cleanup)
      releaseRedirect();
    },
    // 20-second wall-clock timeout: full animation + CI overhead headroom
    { timeout: 20_000 },
  );

  // ── Reduced-motion fast-boot (Phase 3 implements this) ────────────────────
  //
  // When prefers-reduced-motion: reduce is active, the boot should complete
  // in ≤ 300 ms (DESIGN_GUIDE_2026-2.md §8.2).  Phase 3 wires both the CSS
  // keyframes and the JS timers to the matchMedia branch.  Until that lands
  // this test is expected-fail so the slot exists.
  test(
    'reduced-motion boot completes in ≤ 300 ms (expected failure until Phase 3)',
    async ({ page }) => {
      // Mark as expected to fail — Phase 3 will flip this to a passing test
      test.fail();

      // Emulate prefers-reduced-motion
      await page.emulateMedia({ reducedMotion: 'reduce' });

      let releaseRedirect!: () => void;
      const redirectHeld = new Promise<void>((resolve) => { releaseRedirect = resolve; });
      await page.route('**/resume**', async (route) => {
        await redirectHeld;
        await route.continue();
      });

      const start = Date.now();
      await page.goto('/');

      const container = page.locator('.crt-container').first();
      // Phase 3: the powered-on state should arrive in ≤ 300 ms
      await expect(container).toHaveClass(/powered-on/, { timeout: 600 });

      const elapsed = Date.now() - start;
      // This assertion will fail until Phase 3 ships the fast-boot branch
      expect(elapsed).toBeLessThan(300);

      releaseRedirect();
    },
  );
});
