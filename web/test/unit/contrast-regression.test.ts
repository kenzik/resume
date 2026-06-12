/**
 * Contrast regression test for light-theme inline code chips.
 *
 * Live bug documented in DESIGN_GUIDE_2026-2.md §5.3:
 *   The light theme uses --color-brightBlack (#666666) as the code-chip background,
 *   and --terminal-output (#333333) as the text colour, yielding 2.20:1 contrast.
 *   WCAG 2.1 AA requires ≥ 4.5:1 for normal text.
 *
 * Phase 3 ships `terminal.codeBackground: #e8e8e8` for the light theme (10.31:1),
 * flipping this test to passing.  Until that PR lands, this test is expected-fail
 * so the regression is documented — not silent.
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

// ── Token values from src/themes/light.json ──────────────────────────────────

const LIGHT_OUTPUT_TEXT = '#333333';   // --terminal-output (code chip text)
const LIGHT_BRIGHT_BLACK = '#666666';  // --color-brightBlack (code chip background, see DESIGN_GUIDE §3.3)

// ── Passing: dark theme code chips are already contrast-safe ─────────────────

describe('dark theme code chip contrast', () => {
  it('passes WCAG AA (≥ 4.5:1)', () => {
    const darkBrightGreen = '#23d18b'; // --color-brightGreen (output colour)
    const darkBrightBlack = '#333333'; // --color-brightBlack (chip background)
    const ratio = contrastRatio(darkBrightGreen, darkBrightBlack);
    // Dark theme uses output text on brightBlack background — this is fine
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });
});

// ── Expected failure: light theme code chips (live bug, Phase 3 fixes this) ──

describe('light theme code chip contrast (LIVE BUG — DESIGN_GUIDE_2026-2.md §5.3)', () => {
  // it.fails() documents the known regression without hiding it.
  // The fixing PR (Phase 3) flips this to a regular `it()` that passes.
  it.fails(
    'light theme code chip contrast is ≥ 4.5:1 — currently 2.20:1 (expected failure until Phase 3)',
    () => {
      const ratio = contrastRatio(LIGHT_OUTPUT_TEXT, LIGHT_BRIGHT_BLACK);
      // The actual ratio is ~2.20 — assertion below will fail, as expected
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    },
  );

  it('documents the actual (failing) ratio so it is visible in test output', () => {
    const ratio = contrastRatio(LIGHT_OUTPUT_TEXT, LIGHT_BRIGHT_BLACK);
    // Confirm this is the known broken value (within rounding tolerance)
    expect(ratio).toBeGreaterThan(2.0);
    expect(ratio).toBeLessThan(3.0);
  });
});
