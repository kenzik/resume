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
}

export interface ThemeFont {
  family: string;
  size: string;
  lineHeight: string;
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

