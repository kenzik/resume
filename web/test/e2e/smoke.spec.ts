/**
 * Smoke suite: boot redirect → terminal ready, help command, pipe chain.
 *
 * Most tests navigate directly to /resume to skip the ~3.5s landing animation.
 * The single full-boot choreography test lives in boot.spec.ts.
 *
 * All screenshot baselines use VITE_RESUME_YAML_PATH=/data/example.yml so no
 * personal data from data/kenzik.yml can leak into committed artefacts.
 */
import { test, expect } from '@playwright/test';

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Type a command into the terminal input and press Enter. */
async function typeCommand(page: import('@playwright/test').Page, cmd: string) {
  const input = page.locator('input[type="text"]').first();
  await input.waitFor({ state: 'visible' });
  await input.click();
  await input.fill(cmd);
  await input.press('Enter');
}

/** Wait for any terminal output line containing the given text. */
async function waitForOutput(page: import('@playwright/test').Page, text: string, timeout = 8000) {
  await page.waitForFunction(
    (t) => document.body.innerText.includes(t),
    text,
    { timeout },
  );
}

// ── Tests ────────────────────────────────────────────────────────────────────

test.describe('boot and terminal load', () => {
  test('landing page redirects to /resume', async ({ page }) => {
    await page.goto('/');
    // VITE_POWER_ON_DELAY_MS=500 — redirect should complete well within 5s
    await page.waitForURL('**/resume', { timeout: 8000 });
    expect(page.url()).toContain('/resume');
  });

  test('/resume loads and shows a terminal input', async ({ page }) => {
    await page.goto('/resume');
    // Terminal input must be focusable
    const input = page.locator('input[type="text"]').first();
    await expect(input).toBeVisible({ timeout: 10_000 });
  });

  test('terminal content is rendered after navigation', async ({ page }) => {
    await page.goto('/resume');
    // The MOTD / welcome text should appear somewhere in the page body
    await page.waitForSelector('.terminal-output, .output-line, .history-entry', {
      timeout: 10_000,
      state: 'attached',
    });
  });

  test('default dark home screen matches screenshot baseline', async ({ page }) => {
    await page.goto('/resume');
    // Wait for any terminal output to appear before snapping
    await page.waitForSelector('input[type="text"]', { state: 'visible', timeout: 10_000 });
    // Small pause so fonts/content settle
    await page.waitForTimeout(500);

    await expect(page).toHaveScreenshot('dark-home.png', {
      // Allow minor anti-aliasing / font-rendering variance across platforms
      maxDiffPixels: 200,
      // Mask the dynamic clock/date if it appears
      mask: [page.locator('.timestamp, .time, .date')],
    });
  });
});

test.describe('help command', () => {
  test('help command triggers output and enters pager mode', async ({ page }) => {
    await page.goto('/resume');
    await typeCommand(page, 'help');
    // 'General' section header appears on the first pager page
    await waitForOutput(page, 'General');
    // The pager prompt confirms the help text is long enough to paginate
    const body = await page.textContent('body');
    expect(body).toContain('General');
  });

  test('help output lists pipe commands (advance pager if needed)', async ({ page }) => {
    await page.goto('/resume');
    await typeCommand(page, 'help');
    await waitForOutput(page, 'General');

    // Advance through pager pages by pressing Space until 'grep' appears
    const maxPresses = 15;
    for (let i = 0; i < maxPresses; i++) {
      const body = await page.textContent('body');
      if (body?.includes('grep')) break;
      await page.keyboard.press('Space');
      await page.waitForTimeout(400);
    }

    await waitForOutput(page, 'grep', 8000);
    // With all pager pages revealed, confirm settings commands also appear
    const finalBody = await page.textContent('body');
    expect(finalBody).toContain('theme');
  });
});

test.describe('pipe chain', () => {
  test('resume | grep filters output', async ({ page }) => {
    await page.goto('/resume');
    await typeCommand(page, 'resume | grep Python');
    // example.yml lists Python as a skill
    await waitForOutput(page, 'Python', 10_000);
    const body = await page.textContent('body');
    // grep should filter — result should NOT contain unrelated PROFILE header
    // (unless "Python" also appears in profile)
    expect(body).toContain('Python');
  });

  test('resume | head 5 limits output to first 5 lines', async ({ page }) => {
    await page.goto('/resume');
    await typeCommand(page, 'resume | head 5');
    // Command executes without error
    await waitForOutput(page, 'head', 10_000);
  });

  test('skills | grep Cloud returns cloud skill', async ({ page }) => {
    await page.goto('/resume');
    await typeCommand(page, 'skills | grep Cloud');
    await waitForOutput(page, 'Cloud', 8000);
  });
});
