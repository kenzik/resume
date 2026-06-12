/**
 * CSS variable defaults
 * Single source of truth for fallback values used across the app
 */

export const CSS_DEFAULTS = {
  colors: {
    background: '#1e1e1e',
    foreground: '#d4d4d4',
    brightBlack: '#333333',
    cursor: '#aeafad',
    selection: '#264f78',
    white: '#e5e5e5',
    brightYellow: '#f5f543',
    brightMagenta: '#d670d6',
  },
  terminal: {
    prompt: '#929292',
    command: '#929292',
    output: '#d4d4d4',
    info: '#29b8db',
    success: '#23d18b',
    error: '#f14c4c',
    warning: '#f5f543',
    codeBackground: '#333333', // §9.2 canonical fallback = dark-theme value (zero visual change on dark; light fixes via live token)
  },
  font: {
    family: 'monospace',
    size: '14px',
    lineHeight: '1.6',
    weight: '400',
  },
  spacing: {
    padding: '20px',
  },
} as const;

export type CSSDefaults = typeof CSS_DEFAULTS;

/**
 * Helper to get a CSS variable with fallback
 */
export function cssVar(name: string, fallback?: string): string {
  return `var(--${name}${fallback ? `, ${fallback}` : ''})`;
}

/**
 * Helper to get color variable with default fallback
 */
export function colorVar(name: keyof typeof CSS_DEFAULTS.colors): string {
  return `var(--color-${name}, ${CSS_DEFAULTS.colors[name]})`;
}

/**
 * Helper to get terminal color variable with default fallback
 */
export function terminalVar(name: keyof typeof CSS_DEFAULTS.terminal): string {
  return `var(--terminal-${name}, ${CSS_DEFAULTS.terminal[name]})`;
}

/**
 * Helper to get font variable with default fallback
 */
export function fontVar(name: keyof typeof CSS_DEFAULTS.font): string {
  return `var(--font-${name}, ${CSS_DEFAULTS.font[name]})`;
}

