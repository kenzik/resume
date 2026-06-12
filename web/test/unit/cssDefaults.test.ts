/**
 * cssDefaults canonical-fallback policy test (DESIGN_GUIDE_2026-2.md §9.2).
 *
 * Every fallback value in CSS_DEFAULTS must equal the corresponding dark-theme
 * value in dark.json.  The dark theme is the canonical fallback: a token that
 * fails to load must render the on-brand default screen, not an off-brand colour.
 *
 * When a new token is added to cssDefaults.ts (e.g. terminal.codeBackground in
 * Phase 3), add it here so the next drift is caught immediately.
 */
import { describe, it, expect } from 'vitest';
import { CSS_DEFAULTS } from '../../src/config/cssDefaults';
import darkJson from '../../src/themes/dark.json';

describe('cssDefaults canonical-fallback policy', () => {
  describe('colors block matches dark.json', () => {
    const tracked = [
      'background',
      'foreground',
      'brightBlack',
      'cursor',
      'selection',
      'white',
      'brightYellow',
      'brightMagenta',
    ] as const;

    for (const key of tracked) {
      it(`colors.${key} === dark.json colors.${key}`, () => {
        expect(CSS_DEFAULTS.colors[key]).toBe(
          (darkJson.colors as Record<string, string>)[key]
        );
      });
    }
  });

  describe('terminal block matches dark.json', () => {
    const tracked = [
      'prompt',
      'command',
      'output',
      'info',
      'success',
      'error',
      'warning',
      'codeBackground',
    ] as const;

    for (const key of tracked) {
      it(`terminal.${key} === dark.json terminal.${key}`, () => {
        expect(CSS_DEFAULTS.terminal[key]).toBe(
          (darkJson.terminal as Record<string, string>)[key]
        );
      });
    }
  });
});
