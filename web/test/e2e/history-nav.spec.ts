/**
 * Command-history navigation: recalling a command via ArrowUp must leave the
 * caret at the END of the input so Backspace edits the recalled text.
 *
 * Repro for the asymmetric bug: Backspace did nothing after ArrowUp (history
 * back) but worked after ArrowDown (history forward), because the native
 * ArrowUp "caret to start" action was not prevented and the recall left the
 * caret at position 0 — Backspace at position 0 deletes nothing.
 */
import { test, expect } from '@playwright/test';

type PWPage = import('@playwright/test').Page;

const inputLocator = (page: PWPage) => page.locator('input[type="text"]').first();

/** Type a command character-by-character and submit (real keystrokes, not fill). */
async function runCommand(page: PWPage, cmd: string) {
  const input = inputLocator(page);
  await input.click();
  await input.pressSequentially(cmd);
  await input.press('Enter');
}

/** Read the focused terminal input's value + caret offset from the DOM. */
async function readInputState(page: PWPage) {
  return page.evaluate(() => {
    const el = document.activeElement as HTMLInputElement | null;
    return { value: el?.value ?? null, caret: el?.selectionStart ?? null };
  });
}

test.describe('command history caret position', () => {
  test('Backspace edits a command recalled with ArrowUp', async ({ page }) => {
    await page.goto('/resume');
    const input = inputLocator(page);
    await expect(input).toBeVisible({ timeout: 10_000 });

    // Seed history with a known command.
    await runCommand(page, 'help');

    // Recall it with ArrowUp.
    await input.click();
    await input.press('ArrowUp');
    await expect(input).toHaveValue('help');

    // The caret must be at the end of the recalled text.
    const afterUp = await readInputState(page);
    expect(afterUp.value).toBe('help');
    expect(afterUp.caret).toBe('help'.length);

    // Backspace must delete the last character.
    await input.press('Backspace');
    await expect(input).toHaveValue('hel');
  });

  test('Backspace edits a command recalled with ArrowDown (forward)', async ({ page }) => {
    await page.goto('/resume');
    const input = inputLocator(page);
    await expect(input).toBeVisible({ timeout: 10_000 });

    // Two commands so we can walk back two and come forward one.
    await runCommand(page, 'help');
    await runCommand(page, 'skills');

    await input.click();
    await input.press('ArrowUp'); // → skills (newest)
    await input.press('ArrowUp'); // → help   (older)
    await expect(input).toHaveValue('help');
    await input.press('ArrowDown'); // → skills (forward)
    await expect(input).toHaveValue('skills');

    const afterDown = await readInputState(page);
    expect(afterDown.caret).toBe('skills'.length);

    await input.press('Backspace');
    await expect(input).toHaveValue('skill');
  });
});
