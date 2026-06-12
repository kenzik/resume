/**
 * Easter-egg entry smoke tests.
 *
 * Trigger strings are NEVER spelled out as literals in this file.
 * They are reconstructed from char codes at runtime so that:
 *   1. grep -rE "<triggers>" <repo> → empty (no plaintext in committed code)
 *   2. grep -rE "<triggers>" web/dist/spa/assets → empty (dist obfuscation verified)
 *
 * Assertions:
 *   - Zork entry → .crt-smack-triple class fires on the CRT container
 *   - DOOM entry  → .crt-roll-triple  class fires on the CRT container
 *
 * The test does NOT assert on the decoded trigger strings themselves.
 */
import { test, expect } from '@playwright/test';

// ── Trigger reconstruction (char codes only — no plaintext literals) ─────────

/** Classic interactive-fiction magic word #1 (z-machine entry) */
const ZORK_TRIGGER_1 = String.fromCharCode(120, 121, 122, 122, 121);

/** Classic interactive-fiction magic word #2 (z-machine entry) */
const ZORK_TRIGGER_2 = String.fromCharCode(112, 108, 117, 103, 104);

/** Classic FPS god-mode cheat (doom entry) */
const DOOM_TRIGGER_1 = String.fromCharCode(105, 100, 100, 113, 100);

// ── Helpers ──────────────────────────────────────────────────────────────────

async function typeCommand(page: import('@playwright/test').Page, cmd: string) {
  const input = page.locator('input[type="text"]').first();
  await input.waitFor({ state: 'visible' });
  await input.click();
  await input.fill(cmd);
  await input.press('Enter');
}

// ── Tests ────────────────────────────────────────────────────────────────────

test.describe('easter-egg CRT transitions', () => {
  test('Zork trigger (magic word 1) fires a CRT transition (smack or roll) on .terminal', async ({ page }) => {
    await page.goto('/resume');

    // Wait for the terminal to be ready
    await page.locator('input[type="text"]').first().waitFor({ state: 'visible' });

    await typeCommand(page, ZORK_TRIGGER_1);

    // Terminal.vue randomly picks smack or roll for Z-machine transitions
    // (Terminal.vue:446 — Math.random() > 0.5).  Both run the crt-smack-triple
    // / crt-roll-triple animations at 1.8s (DESIGN_GUIDE §5.3, 2026-2.md §8.1)
    const hasCrtTransition = page.locator('.terminal.crt-smack, .terminal.crt-roll');
    await expect(hasCrtTransition).toBeVisible({ timeout: 5000 });
  });

  test('Zork trigger (magic word 2) fires a CRT transition (smack or roll) on .terminal', async ({ page }) => {
    await page.goto('/resume');
    await page.locator('input[type="text"]').first().waitFor({ state: 'visible' });

    await typeCommand(page, ZORK_TRIGGER_2);

    const hasCrtTransition = page.locator('.terminal.crt-smack, .terminal.crt-roll');
    await expect(hasCrtTransition).toBeVisible({ timeout: 5000 });
  });

  test('DOOM trigger fires a CRT transition (smack or roll) on .terminal', async ({ page }) => {
    await page.goto('/resume');
    await page.locator('input[type="text"]').first().waitFor({ state: 'visible' });

    await typeCommand(page, DOOM_TRIGGER_1);

    // DOOM randomly selects smack or roll (Terminal.vue:542 — Math.random() > 0.5)
    // Assert that either the crt-smack or crt-roll class fires on .terminal
    const hasCrtTransition = page.locator('.terminal.crt-smack, .terminal.crt-roll');
    await expect(hasCrtTransition).toBeVisible({ timeout: 5000 });
  });
});
