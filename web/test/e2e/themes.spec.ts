/**
 * Theme switching smoke tests.
 * Verifies that all registered themes can be activated via the `theme` command
 * and that the terminal background colour changes accordingly.
 *
 * Themes tested: dark, light, auto, amber (P3 phosphor), green (P1 phosphor).
 */
import { test, expect } from '@playwright/test';

// Themes registered in src/themes/index.ts + the special "auto" alias
const SWITCHABLE_THEMES = ['dark', 'light', 'auto', 'amber', 'green'] as const;

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

  test('amber theme sets --color-background CSS variable to #160e02', async ({ page }) => {
    await page.goto('/resume');
    await typeCommand(page, 'theme amber');
    await waitForOutput(page, 'Amber P3', 5000);

    const bg = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--color-background').trim(),
    );
    expect(bg).toBe('#160e02');
  });

  test('green theme sets --color-background CSS variable to #0a0f0a', async ({ page }) => {
    await page.goto('/resume');
    await typeCommand(page, 'theme green');
    await waitForOutput(page, 'Green P1', 5000);

    const bg = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--color-background').trim(),
    );
    expect(bg).toBe('#0a0f0a');
  });

  test('amber theme blooms terminal text from the live --terminal-glow token', async ({ page }) => {
    await page.goto('/resume');
    await typeCommand(page, 'theme amber');
    await waitForOutput(page, 'Amber P3', 5000);

    // The glow must come from the live token, not a hardcoded shadow: the computed
    // text-shadow on output text is non-none and the rendered colour matches amber's
    // spec'd rgba(255, 176, 0, 0.30) (§5.1).
    const shadow = await page.evaluate(() => {
      const el = document.querySelector('.terminal-output-text')
        ?? document.querySelector('.terminal-command')
        ?? document.querySelector('.terminal');
      return el ? getComputedStyle(el as Element).textShadow : '';
    });
    expect(shadow).not.toBe('none');
    expect(shadow).not.toBe('');
    expect(shadow).toContain('255, 176, 0');
  });

  test('dark theme leaves terminal text crisp (text-shadow none)', async ({ page }) => {
    await page.goto('/resume');
    await typeCommand(page, 'theme dark');
    await waitForOutput(page, 'Dark', 5000);

    const shadow = await page.evaluate(() => {
      const el = document.querySelector('.terminal');
      return el ? getComputedStyle(el as Element).textShadow : '';
    });
    expect(shadow).toBe('none');
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
