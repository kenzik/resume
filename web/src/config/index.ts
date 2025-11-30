import fontsConfig from './fonts.json';

// Re-export CSS defaults
export * from './cssDefaults';

// =============================================================================
// Pager Configuration (for `more` and `less` commands)
// =============================================================================
export const PAGER_CONFIG = {
  // Base message shown when more content is available (download hint added dynamically for resume)
  morePrompt: '-- Press a key for next page, q to quit --',
  
  // Base message shown at the end of content (download hint added dynamically for resume)
  endPrompt: '(END) Press any key to exit',
  
  // Format string for progress (use {current} and {total} placeholders)
  progressFormat: '({current}/{total} lines)',
  
  // Keys that advance to the next page
  nextPageKeys: [' ', 'Enter', 'f', 'PageDown'],
  
  // Keys that exit the pager
  exitKeys: ['q', 'Escape'],
  
  // Lines to reserve at bottom for pager prompt
  reservedLines: 2,
};

// Helper to format progress string
export function formatPagerProgress(current: number, total: number): string {
  return PAGER_CONFIG.progressFormat
    .replace('{current}', String(current))
    .replace('{total}', String(total));
}

// =============================================================================
// Font Configuration
// =============================================================================
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

