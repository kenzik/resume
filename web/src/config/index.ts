import fontsConfig from './fonts.json';

export interface FontConfig {
  name: string;
  family: string;
  webFont?: string; // Google Fonts URL or other web font source
  note?: string; // Optional note about the font
}

export interface FontsConfig {
  default: string;
  defaultLineHeight: number;
  fonts: FontConfig[];
}

export const fonts: FontsConfig = fontsConfig as FontsConfig;

export function getFont(name: string): FontConfig | undefined {
  return fonts.fonts.find(f => f.name === name);
}

export function getDefaultFont(): string {
  return fonts.default;
}

export function getDefaultLineHeight(): number {
  return fonts.defaultLineHeight;
}

// Track which web fonts have been loaded
const loadedWebFonts = new Set<string>();

/**
 * Load a web font if it has a webFont URL specified
 */
export function loadWebFont(fontName: string): void {
  const font = getFont(fontName);
  if (!font?.webFont || loadedWebFonts.has(fontName)) {
    return;
  }

  // Create and append link element
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = font.webFont;
  document.head.appendChild(link);
  
  loadedWebFonts.add(fontName);
}

/**
 * Preload all web fonts (call on app initialization)
 */
export function preloadWebFonts(): void {
  fonts.fonts.forEach(font => {
    if (font.webFont) {
      loadWebFont(font.name);
    }
  });
}

