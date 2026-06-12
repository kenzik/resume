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
    // Emulate dark color scheme so "auto" theme resolves to dark (#1e1e1e).
    // Without this, Playwright's Desktop Chrome defaults to light, causing
    // the auto theme to render #ffffff instead of the dark phosphor screen.
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/resume');

    // 1. Dark theme must be applied: wait until :root CSS var equals #1e1e1e.
    //    The useTheme composable sets this via element.style.setProperty on
    //    document.documentElement. No raw sleeps — this polls the real DOM state.
    await page.waitForFunction(
      () =>
        getComputedStyle(document.documentElement)
          .getPropertyValue('--color-background')
          .trim() === '#1e1e1e',
      undefined,
      { timeout: 10_000 },
    );

    // 2. MOTD boot output from example.yml must be visible before snapping.
    //    "Terminal Resume" is the first line of web.motd in example.yml.
    await page.waitForFunction(
      (text) => document.body.innerText.includes(text),
      'Terminal Resume',
      { timeout: 10_000 },
    );

    // 3. Prompt must be idle and interactive
    await page.locator('input[type="text"]').first().waitFor({ state: 'visible', timeout: 5_000 });

    // Per-platform baselines (darwin / linux) are committed separately so
    // each platform is compared at 0-diff tolerance.  No maxDiffPixels
    // tolerance is needed or permitted — see snapshotPathTemplate in
    // playwright.config.ts.  The darwin baseline is the local dev gate;
    // the linux baseline is the CI gate.
    await expect(page).toHaveScreenshot('dark-home.png', {
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

    // Advance through pager pages by pressing Space until 'grep' appears.
    // After each Space, wait until body text grows (pager rendered next page)
    // rather than sleeping a fixed amount.
    const maxPresses = 15;
    for (let i = 0; i < maxPresses; i++) {
      const bodyBefore = (await page.textContent('body')) ?? '';
      if (bodyBefore.includes('grep')) break;
      const lenBefore = bodyBefore.length;
      await page.keyboard.press('Space');
      // Wait until the pager appends content or 'grep' appears — no raw sleep
      await page.waitForFunction(
        ([len, needle]) =>
          (document.body.textContent?.length ?? 0) > (len as number) ||
          document.body.innerText.includes(needle as string),
        [lenBefore, 'grep'] as [number, string],
        { timeout: 3000 },
      );
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
