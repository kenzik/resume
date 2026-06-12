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
// The JS half of the dual-clocked boot ritual (DESIGN_GUIDE_2026-2.md §8.1).
// The CSS half lives in web/src/css/crt-timing.scss. Same numbers, named once —
// change a phase here and re-derive the CSS timeline in the same commit.
//   poweredOnMs — content reveal (animationClass → 'powered-on')
//   redirectMs  — route to /resume; env-overridable via VITE_POWER_ON_DELAY_MS
// =============================================================================
export const BOOT_TIMINGS = {
  poweredOnMs: 3500,
  redirectMs: Number(import.meta.env.VITE_POWER_ON_DELAY_MS) || 5000,
} as const;

// =============================================================================
// Terminal Configuration
// =============================================================================
export const TERMINAL_CONFIG = {
  commandHistoryMaxLength: 50,
  scrollDebounceMs: 50,
  typewriterScrollDebounceMs: 50,
} as const;

