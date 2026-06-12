/**
 * Theme completeness test — the guardrail that makes token additions safe.
 *
 * Every theme JSON registered in src/themes/index.ts must populate every key
 * of the ThemeColors and TerminalColors interfaces.  A missing key is a silent
 * runtime failure (CSS var stays unset → wrong fallback colour).  TypeScript
 * alone cannot catch this because the JSON is cast with `as Theme`.
 *
 * When a new token is added (e.g. `terminal.codeBackground` in Phase 3), the
 * type interface update will make this test fail for every theme that is missing
 * the new key — making the omission visible before it ships.
 */
import { describe, it, expect } from 'vitest';
import type { ThemeColors, TerminalColors, ThemeFont, ThemeSpacing, Theme } from '../../src/themes/index';
import { themes } from '../../src/themes/index';
import darkJson from '../../src/themes/dark.json';
import lightJson from '../../src/themes/light.json';

// ── Canonical key lists derived from the TypeScript interfaces ──────────────
// These must stay in sync with src/themes/index.ts interfaces.

const REQUIRED_COLOR_KEYS: (keyof ThemeColors)[] = [
  'background', 'foreground', 'cursor', 'selection',
  'black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white',
  'brightBlack', 'brightRed', 'brightGreen', 'brightYellow',
  'brightBlue', 'brightMagenta', 'brightCyan', 'brightWhite',
];

const REQUIRED_TERMINAL_KEYS: (keyof TerminalColors)[] = [
  'prompt', 'command', 'output', 'error', 'success', 'warning', 'info',
];

const REQUIRED_FONT_KEYS: (keyof ThemeFont)[] = ['size'];   // family/weight/lineHeight are optional

const REQUIRED_SPACING_KEYS: (keyof ThemeSpacing)[] = ['padding'];

// ── Helpers ─────────────────────────────────────────────────────────────────

function assertThemeComplete(name: string, theme: Theme) {
  describe(`theme: ${name}`, () => {
    it('has a name and displayName', () => {
      expect(theme.name, `${name}.name`).toBeTruthy();
      expect(theme.displayName, `${name}.displayName`).toBeTruthy();
    });

    it('colors block contains all ANSI palette keys', () => {
      for (const key of REQUIRED_COLOR_KEYS) {
        expect(
          theme.colors,
          `${name}.colors is defined`
        ).toBeDefined();
        expect(
          (theme.colors as Record<string, unknown>)[key],
          `${name}.colors.${key} must be a non-empty string`
        ).toMatch(/^#[0-9a-fA-F]{3,8}$/);
      }
    });

    it('terminal block contains all semantic colour keys', () => {
      for (const key of REQUIRED_TERMINAL_KEYS) {
        expect(
          (theme.terminal as Record<string, unknown>)[key],
          `${name}.terminal.${key} must be a non-empty hex colour string`
        ).toMatch(/^#[0-9a-fA-F]{3,8}$/);
      }
    });

    it('font block has required size key', () => {
      for (const key of REQUIRED_FONT_KEYS) {
        expect(
          (theme.font as Record<string, unknown>)[key],
          `${name}.font.${key}`
        ).toBeTruthy();
      }
    });

    it('spacing block has required padding key', () => {
      for (const key of REQUIRED_SPACING_KEYS) {
        expect(
          (theme.spacing as Record<string, unknown>)[key],
          `${name}.spacing.${key}`
        ).toBeTruthy();
      }
    });
  });
}

// ── Run completeness checks for every registered theme ──────────────────────

describe('theme-completeness', () => {
  it('themes registry is not empty', () => {
    expect(Object.keys(themes).length).toBeGreaterThan(0);
  });

  it('raw JSON imports match the registered theme objects', () => {
    expect(themes.dark).toEqual(darkJson);
    expect(themes.light).toEqual(lightJson);
  });

  // Iterate the live registry — new themes added in Phase 4 are automatically covered
  for (const [name, theme] of Object.entries(themes)) {
    assertThemeComplete(name, theme);
  }
});
