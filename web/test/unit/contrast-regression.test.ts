/**
 * Contrast regression test for light-theme inline code chips.
 *
 * Phase 3 shipped `terminal.codeBackground` (DESIGN_GUIDE_2026-2.md §5.3):
 *   dark  = #333333 — identical to the old --color-brightBlack value; zero visual change.
 *   light = #e8e8e8 — fixes the live bug: was #666666 (2.20:1), now 10.31:1.
 *
 * Both theme values are reflected in terminal.scss via
 *   var(--terminal-codeBackground, #333333)
 * replacing the former var(--color-brightBlack, #333333).
 */
import { describe, it, expect } from 'vitest';

// ── WCAG relative-luminance & contrast-ratio helpers ─────────────────────────

function linearise(c: number): number {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

function relativeLuminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return 0.2126 * linearise(r) + 0.7152 * linearise(g) + 0.0722 * linearise(b);
}

function contrastRatio(fg: string, bg: string): number {
  const l1 = relativeLuminance(fg);
  const l2 = relativeLuminance(bg);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// ── Token values from src/themes/*.json (Phase 3) ────────────────────────────

const DARK_CODE_BACKGROUND  = '#333333';  // dark.json  terminal.codeBackground
const LIGHT_CODE_BACKGROUND = '#e8e8e8';  // light.json terminal.codeBackground
const LIGHT_OUTPUT_TEXT     = '#333333';  // light.json terminal.output (code chip text colour)

// ── Dark theme: code chips are contrast-safe (unchanged from before Phase 3) ──

describe('dark theme code chip contrast', () => {
  it('passes WCAG AA (≥ 4.5:1)', () => {
    const darkBrightGreen = '#23d18b'; // --color-brightGreen (output colour)
    const ratio = contrastRatio(darkBrightGreen, DARK_CODE_BACKGROUND);
    // Dark theme: output text on codeBackground — already fine before Phase 3
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });
});

// ── Light theme: Phase 3 fixes the live-bug (was 2.20:1, now 10.31:1) ────────

describe('light theme code chip contrast (fixed in Phase 3 — DESIGN_GUIDE_2026-2.md §5.3)', () => {
  it('light theme code chip contrast is ≥ 4.5:1 with terminal.codeBackground #e8e8e8', () => {
    const ratio = contrastRatio(LIGHT_OUTPUT_TEXT, LIGHT_CODE_BACKGROUND);
    // #333333 on #e8e8e8 — design guide specifies 10.31:1
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  it('light theme code chip contrast is in the expected range (~10.31:1)', () => {
    const ratio = contrastRatio(LIGHT_OUTPUT_TEXT, LIGHT_CODE_BACKGROUND);
    expect(ratio).toBeGreaterThan(10.0);
    expect(ratio).toBeLessThan(11.0);
  });
});
