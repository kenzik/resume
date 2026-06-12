/**
 * Shared constants for the resume terminal application
 * Consolidates magic strings and configuration values
 */

// =============================================================================
// Command Prefixes
// Re-exported from commands module for convenience
// =============================================================================
export { COMMAND_PREFIXES } from '../commands/types';
export { COMMAND_PREFIXES as default } from '../commands/types';

// Legacy exports for backward compatibility
export const NAV_PREFIX = '__NAV__';
export const ZMACHINE_PREFIX = '__Z__';

// =============================================================================
// Breakpoints
// =============================================================================
export const MOBILE_BREAKPOINT = 768;

// =============================================================================
// Local Storage Keys
// Used by composables for persisting user preferences
// =============================================================================
export const STORAGE_KEYS = {
  theme: 'kenzik-resume-theme',
  font: 'kenzik-resume-font',
  lineHeight: 'kenzik-resume-line-height',
} as const;

// =============================================================================
// Typewriter Speeds
// Configuration for different typewriter effect contexts
// =============================================================================
export const TYPEWRITER_SPEEDS = {
  default: { delay: 5, charsPerTick: 5 },
  pager: { delay: 2, charsPerTick: 50 },
  zmachine: { delay: 3, charsPerTick: 8 },
} as const;

// =============================================================================
// Boot Timings (JS clock)
// The JS half of the dual-clocked boot ritual (DESIGN_GUIDE_2026-2.md §8.1/§8.2).
// The CSS half lives in web/src/css/crt-timing.scss. Same numbers, named once —
// change a phase here and re-derive the CSS timeline in the same commit.
//   poweredOnMs — content reveal (animationClass → 'powered-on')
//   redirectMs  — route to /resume; env-overridable via VITE_POWER_ON_DELAY_MS
//
// reducedMotion — the §8.2 "fast-boot switch" (prefers-reduced-motion: reduce).
// Clocks collapse proportionally: poweredOnMs 3500 → 300, redirect 5000 → 800.
// The env override is applied to BOTH variants, so VITE_POWER_ON_DELAY_MS wins
// over the 800ms default exactly as it wins over the 5000ms default — the test
// harness's fast-boot path is preserved regardless of motion preference; the
// 800ms default only takes effect in production where no override is set.
// =============================================================================
const ENV_REDIRECT_MS = Number(import.meta.env.VITE_POWER_ON_DELAY_MS) || undefined;

export const BOOT_TIMINGS = {
  poweredOnMs: 3500,
  redirectMs: ENV_REDIRECT_MS ?? 5000,
  reducedMotion: {
    poweredOnMs: 300,
    redirectMs: ENV_REDIRECT_MS ?? 800,
  },
} as const;

// =============================================================================
// CRT Easter-Egg Transition Timing (JS clock)
// Mirrors --crt-smack-duration / --crt-roll-duration in crt-timing.scss. The JS
// (Terminal.vue) waits this long on a setTimeout — not animationend — before
// switching into the game mode. Under reduced motion the CSS animation is
// suppressed (crt-effects.scss), so the JS must not wait on it: the egg cuts
// directly to its mode (DESIGN_GUIDE_2026-2.md §8.2).
// =============================================================================
export const CRT_TRANSITION_TIMINGS = {
  durationMs: 1800,
  reducedMotionMs: 0,
} as const;

// =============================================================================
// Terminal Configuration
// =============================================================================
export const TERMINAL_CONFIG = {
  commandHistoryMaxLength: 50,
  scrollDebounceMs: 50,
  typewriterScrollDebounceMs: 50,
} as const;

