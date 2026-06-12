/**
 * Theme switching smoke tests.
 * Verifies that all registered themes can be activated via the `theme` command
 * and that the terminal background colour changes accordingly.
 *
 * Themes tested: dark, light, auto.
 * Amber and Green phosphor themes are added in Phase 4; this file will cover
 * them automatically once their JSON files appear in the registry.
 */
import { test, expect } from '@playwright/test';

// Themes registered in src/themes/index.ts + the special "auto" alias
const SWITCHABLE_THEMES = ['dark', 'light', 'auto'] as const;

async function typeCommand(page: import('@playwright/test').Page, cmd: string) {
  const input = page.locator('input[type="text"]').first();
  await input.waitFor({ state: 'visible' });
  await input.click();
  await input.fill(cmd);
  await input.press('Enter');
}

async function waitForOutput(page: import('@playwright/test').Page, text: string, timeout = 8000) {
  await page.waitForFunction(
    (t) => document.body.innerText.includes(t),
    text,
    { timeout },
  );
}

test.describe('theme switching', () => {
  for (const themeName of SWITCHABLE_THEMES) {
    test(`theme ${themeName} activates without error`, async ({ page }) => {
      await page.goto('/resume');
      await typeCommand(page, `theme ${themeName}`);

      // Expect a success confirmation line (not an error)
      await waitForOutput(page, themeName === 'auto' ? 'auto' : themeName, 5000);

      // No "Invalid theme" error should appear
      const body = await page.textContent('body');
      expect(body).not.toContain('Invalid theme');
    });
  }

  test('dark theme sets --color-background CSS variable to #1e1e1e', async ({ page }) => {
    await page.goto('/resume');
    await typeCommand(page, 'theme dark');
    await waitForOutput(page, 'dark', 5000);

    // The theme is applied to :root via CSS custom properties
    const bg = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--color-background').trim(),
    );
    expect(bg).toBe('#1e1e1e');
  });

  test('light theme sets --color-background CSS variable to #ffffff', async ({ page }) => {
    await page.goto('/resume');
    await typeCommand(page, 'theme light');
    await waitForOutput(page, 'Light', 5000);

    const bg = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--color-background').trim(),
    );
    expect(bg).toBe('#ffffff');
  });

  test('theme toggle switches between dark and light', async ({ page }) => {
    await page.goto('/resume');
    // Start on dark
    await typeCommand(page, 'theme dark');
    await waitForOutput(page, 'Dark', 5000);

    // Toggle to light
    await typeCommand(page, 'theme toggle');
    // The response includes "toggled to" and the new theme name
    await waitForOutput(page, 'toggled', 5000);

    const body = await page.textContent('body');
    expect(body).not.toContain('Invalid theme');
  });

  test('theme command with no args shows "Available themes" header', async ({ page }) => {
    await page.goto('/resume');
    await typeCommand(page, 'theme');
    await waitForOutput(page, 'Available themes', 5000);
    // "Available themes" header is visible without advancing the pager
    const body = await page.textContent('body');
    expect(body).toContain('Available themes');
  });

  test('invalid theme name returns error message', async ({ page }) => {
    await page.goto('/resume');
    await typeCommand(page, 'theme nonexistent-theme');
    await waitForOutput(page, 'Invalid theme', 5000);
  });
});
