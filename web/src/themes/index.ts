export interface ThemeColors {
  background: string;
  foreground: string;
  cursor: string;
  selection: string;
  black: string;
  red: string;
  green: string;
  yellow: string;
  blue: string;
  magenta: string;
  cyan: string;
  white: string;
  brightBlack: string;
  brightRed: string;
  brightGreen: string;
  brightYellow: string;
  brightBlue: string;
  brightMagenta: string;
  brightCyan: string;
  brightWhite: string;
}

export interface TerminalColors {
  prompt: string;
  command: string;
  output: string;
  error: string;
  success: string;
  warning: string;
  info: string;
  codeBackground: string;
  /** Full CSS text-shadow value. "none" for dark/light (P4-ish, short persistence, crisp text). */
  glow: string;
}

export interface ThemeFont {
  family?: string; // Optional - font family is managed by useFont composable
  size: string;
  weight?: string;
  // lineHeight is intentionally absent: per-font line-height is owned by useFont
}

export interface ThemeSpacing {
  padding: string;
}

export interface Theme {
  name: string;
  displayName: string;
  colors: ThemeColors;
  terminal: TerminalColors;
  font: ThemeFont;
  spacing: ThemeSpacing;
}

export type ThemeName = 'dark' | 'light' | 'auto';

// Import theme JSON files
import darkTheme from './dark.json';
import lightTheme from './light.json';

export const themes: Record<string, Theme> = {
  dark: darkTheme as Theme,
  light: lightTheme as Theme,
};

export function getTheme(name: string): Theme {
  return themes[name] || themes.dark;
}

// =============================================================================
// TOKEN_USAGE — load-bearing annotation map
//
// Generated from actual `--color-*` / `--terminal-*` grep across web/src.
// JSON cannot carry comments; this map is the annotation layer.
// Records which theme keys the UI actively consumes (versus keys present only
// to fill the full ANSI 16-colour slot that real terminal emulators expect).
//
// "load-bearing" = a missing/wrong value visibly breaks the rendered UI.
// "decorative"   = used for borders/chrome; exempt from text-contrast requirements
//                  (per DESIGN_GUIDE_2026-2.md §5 note on brightBlack/blue tier).
// =============================================================================

export type TokenRole = 'load-bearing' | 'decorative' | 'ansi-slot';

export interface TokenUsageEntry {
  readonly role: TokenRole;
  /** Human note on where / how it renders */
  readonly note: string;
  /** Files that reference this token (from grep web/src, 2026-06) */
  readonly consumers: readonly string[];
}

/** Consumed `--color-*` palette keys and their usage. */
export const COLOR_TOKEN_USAGE: Readonly<Record<keyof ThemeColors, TokenUsageEntry>> = {
  // -- Actively consumed by components --
  background:     { role: 'load-bearing', note: 'Root bg; applied directly to document.body by applyTheme',          consumers: ['app.scss', 'App.vue', 'DoomPauseModal.vue', 'Download.vue', 'Landing.vue', 'terminal.scss', 'TerminalPager.vue', 'ZMachineQuitModal.vue'] },
  foreground:     { role: 'load-bearing', note: 'Default text; also ANSI reset/bright colour in ansiToHtml',          consumers: ['ansiToHtml.ts', 'app.scss', 'App.vue', 'DoomCanvas.vue', 'Download.vue', 'terminal.scss', 'TerminalPrompt.vue', 'TerminalZMachine.vue', 'ZMachineQuitModal.vue'] },
  brightBlack:    { role: 'decorative',   note: 'Borders, inline-code chip bg, dim/muted text, scrollbar thumb (CRITICAL: rename is Phase 3)', consumers: ['ansiToHtml.ts', 'app.scss', 'DoomCanvas.vue', 'DoomPauseModal.vue', 'Download.vue', 'terminal.scss', 'TerminalPager.vue', 'TerminalZMachine.vue', 'ZMachineQuitModal.vue'] },
  cursor:         { role: 'load-bearing', note: 'Block-cursor colour; startup cursor in Landing.vue',                  consumers: ['Landing.vue', 'terminal.scss'] },
  selection:      { role: 'load-bearing', note: '::selection pseudo-element in app.scss',                              consumers: ['app.scss'] },
  white:          { role: 'decorative',   note: 'Scrollbar thumb hover colour in app.scss',                            consumers: ['app.scss'] },
  brightYellow:   { role: 'load-bearing', note: 'Download page accent; app.scss highlight',                            consumers: ['app.scss', 'Download.vue'] },
  brightMagenta:  { role: 'ansi-slot',    note: 'ANSI magenta bright in ansiToHtml colour map',                        consumers: ['ansiToHtml.ts'] },
  brightCyan:     { role: 'load-bearing', note: 'Z-Machine prompt colour (TerminalZMachine)',                           consumers: ['TerminalZMachine.vue'] },
  yellow:         { role: 'load-bearing', note: 'Z-Machine title colour (TerminalZMachine)',                            consumers: ['TerminalZMachine.vue'] },

  // -- ANSI slot: present for full 16-colour completeness, not directly referenced in CSS --
  black:          { role: 'ansi-slot', note: 'Full ANSI 16-colour slot; not directly consumed by any component CSS',  consumers: [] },
  red:            { role: 'ansi-slot', note: 'Full ANSI 16-colour slot; not directly consumed by any component CSS',  consumers: [] },
  green:          { role: 'ansi-slot', note: 'Full ANSI 16-colour slot; not directly consumed by any component CSS',  consumers: [] },
  blue:           { role: 'ansi-slot', note: 'Full ANSI 16-colour slot; not directly consumed by any component CSS',  consumers: [] },
  magenta:        { role: 'ansi-slot', note: 'Full ANSI 16-colour slot; not directly consumed by any component CSS',  consumers: [] },
  cyan:           { role: 'ansi-slot', note: 'Full ANSI 16-colour slot; not directly consumed by any component CSS',  consumers: [] },
  brightRed:      { role: 'ansi-slot', note: 'Full ANSI 16-colour slot; not directly consumed by any component CSS',  consumers: [] },
  brightGreen:    { role: 'ansi-slot', note: 'Full ANSI 16-colour slot; not directly consumed by any component CSS',  consumers: [] },
  brightBlue:     { role: 'ansi-slot', note: 'Full ANSI 16-colour slot; not directly consumed by any component CSS',  consumers: [] },
  brightWhite:    { role: 'ansi-slot', note: 'Full ANSI 16-colour slot; not directly consumed by any component CSS',  consumers: [] },
} as const;

/** Consumed `--terminal-*` semantic keys and their usage. */
export const TERMINAL_TOKEN_USAGE: Readonly<Record<keyof TerminalColors, TokenUsageEntry>> = {
  prompt:   { role: 'load-bearing', note: 'Prompt user segment colour (TerminalPrompt.vue); Download page',             consumers: ['TerminalPrompt.vue', 'Download.vue'] },
  command:  { role: 'load-bearing', note: 'Typed command text; .terminal-input; inline-code chip text; cursor caret',   consumers: ['terminal.scss', 'TerminalPager.vue', 'DoomCanvas.vue'] },
  output:   { role: 'load-bearing', note: 'Default command output body text',                                            consumers: ['terminal.scss', 'TerminalPager.vue'] },
  error:    { role: 'load-bearing', note: 'Error-coloured output; ANSI error in ansiToHtml; DOOM / modal errors',        consumers: ['ansiToHtml.ts', 'DoomCanvas.vue', 'Download.vue', 'Terminal.vue', 'ZMachineQuitModal.vue'] },
  success:  { role: 'load-bearing', note: 'Success / phosphor-green: h1/h2 colour, strong text, Landing power-on glow', consumers: ['ansiToHtml.ts', 'DoomPauseModal.vue', 'Download.vue', 'Landing.vue', 'terminal.scss', 'TerminalPager.vue', 'ZMachineQuitModal.vue'] },
  warning:  { role: 'load-bearing', note: 'Warning-coloured output; ANSI yellow in ansiToHtml',                          consumers: ['ansiToHtml.ts'] },
  info:           { role: 'load-bearing', note: 'Info / cyan: h3-h6, typing indicator, prompt path, DOOM stats',               consumers: ['ansiToHtml.ts', 'DoomCanvas.vue', 'DoomPauseModal.vue', 'Download.vue', 'terminal.scss', 'TerminalPager.vue', 'TerminalPrompt.vue', 'ZMachineQuitModal.vue'] },
  codeBackground: { role: 'load-bearing', note: 'Inline-code chip well background (§5.3); dark=#333333 (zero visual change), light=#e8e8e8 (contrast fix)', consumers: ['terminal.scss'] },
  glow:           { role: 'load-bearing', note: 'Full CSS text-shadow for phosphor bloom (§4, §5). "none" for dark/light (P4-ish, short persistence). Consumer pending: crt-effects-engineer (B-tier, §3)', consumers: [] },
} as const;

