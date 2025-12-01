/**
 * Shared constants for the resume terminal application
 * Consolidates magic strings and configuration values
 */

// =============================================================================
// Command Prefixes
// Used by Terminal.vue to detect special command responses
// =============================================================================
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
// Terminal Configuration
// =============================================================================
export const TERMINAL_CONFIG = {
  commandHistoryMaxLength: 50,
  scrollDebounceMs: 50,
  typewriterScrollDebounceMs: 50,
} as const;

