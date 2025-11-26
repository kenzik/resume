import { ref, computed, onMounted, nextTick } from 'vue';

const STORAGE_KEY_FONT = 'kenzik-resume-font';
const STORAGE_KEY_LINE_HEIGHT = 'kenzik-resume-line-height';
const DEFAULT_FONT = 'MonoLisa';
const DEFAULT_LINE_HEIGHT = 1.8; // More spacious default for MonoLisa

// Available fonts
// Note: MonoLisa is a commercial font from https://www.monolisa.dev/
// To use MonoLisa:
//   1. Install it on your system (system font), OR
//   2. Add font files to public/fonts/ and uncomment @font-face in app.scss
// If MonoLisa is not available, fallback fonts will be used.
export const availableFonts = [
  { name: 'MonoLisa', family: "'MonoLisa', 'JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace" },
  { name: 'JetBrains Mono', family: "'JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace" },
  { name: 'Fira Code', family: "'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace" },
  { name: 'Consolas', family: "'Consolas', 'Monaco', 'Courier New', monospace" },
  { name: 'Monaco', family: "'Monaco', 'Courier New', monospace" },
  { name: 'Courier New', family: "'Courier New', monospace" },
];

// Reactive state
const currentFont = ref<string>(DEFAULT_FONT);
const currentLineHeight = ref<number>(DEFAULT_LINE_HEIGHT);

// Load font preference from localStorage
function loadFontPreference(): string {
  if (typeof window === 'undefined') return DEFAULT_FONT;
  
  const stored = localStorage.getItem(STORAGE_KEY_FONT);
  if (stored && availableFonts.find(f => f.name === stored)) {
    return stored;
  }
  return DEFAULT_FONT;
}

// Load line height preference from localStorage
function loadLineHeightPreference(): number {
  if (typeof window === 'undefined') return DEFAULT_LINE_HEIGHT;
  
  const stored = localStorage.getItem(STORAGE_KEY_LINE_HEIGHT);
  if (stored) {
    const parsed = parseFloat(stored);
    if (!isNaN(parsed) && parsed > 0 && parsed <= 3) {
      return parsed;
    }
  }
  return DEFAULT_LINE_HEIGHT;
}

// Save font preference to localStorage
function saveFontPreference(font: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY_FONT, font);
}

// Save line height preference to localStorage
function saveLineHeightPreference(lineHeight: number) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY_LINE_HEIGHT, lineHeight.toString());
}

// Apply font to document
function applyFont(fontName: string) {
  if (typeof document === 'undefined') return;

  const font = availableFonts.find(f => f.name === fontName) || availableFonts[0];
  const root = document.documentElement;
  root.style.setProperty('--font-family', font.family);
}

// Apply line height to document
function applyLineHeight(lineHeight: number) {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  root.style.setProperty('--font-line-height', lineHeight.toString());
}

// Initialize font on first load
let fontInitialized = false;

function initializeFont() {
  if (fontInitialized || typeof window === 'undefined') return;
  fontInitialized = true;
  currentFont.value = loadFontPreference();
  currentLineHeight.value = loadLineHeightPreference();
  applyFont(currentFont.value);
  applyLineHeight(currentLineHeight.value);
  
  // Debug: Log which font is actually being used
  if (typeof document !== 'undefined') {
    setTimeout(() => {
      const body = document.body;
      const computed = window.getComputedStyle(body);
      const renderedFont = computed.fontFamily.split(',')[0].replace(/['"]/g, '').trim();
      console.log('Font system initialized:', {
        requested: currentFont.value,
        rendered: renderedFont,
        lineHeight: currentLineHeight.value
      });
    }, 100);
  }
}

export function useFont() {
  // Initialize font if not already done
  if (typeof window !== 'undefined' && !fontInitialized) {
    initializeFont();
  }

  // Also initialize on mount (for Vue component lifecycle)
  onMounted(() => {
    if (!fontInitialized) {
      nextTick(() => {
        initializeFont();
      });
    }
  });

  // Set font manually
  const setFont = (fontName: string): boolean => {
    const font = availableFonts.find(f => f.name.toLowerCase() === fontName.toLowerCase());
    if (font) {
      currentFont.value = font.name;
      saveFontPreference(font.name);
      applyFont(font.name);
      return true;
    }
    return false;
  };

  // Get current font
  const getCurrentFont = () => {
    return currentFont.value;
  };

  // List available fonts
  const listFonts = () => {
    return availableFonts.map(f => f.name);
  };

  // Set line height
  const setLineHeight = (lineHeight: number): boolean => {
    if (lineHeight > 0 && lineHeight <= 3) {
      currentLineHeight.value = lineHeight;
      saveLineHeightPreference(lineHeight);
      applyLineHeight(lineHeight);
      return true;
    }
    return false;
  };

  // Get current line height
  const getLineHeight = () => {
    return currentLineHeight.value;
  };

  // Check which font is actually being rendered
  const getRenderedFont = (): string => {
    if (typeof document === 'undefined') return 'unknown';
    const body = document.body;
    const computed = window.getComputedStyle(body);
    const fontFamily = computed.fontFamily;
    // Extract the first font from the font-family string
    const firstFont = fontFamily.split(',')[0].replace(/['"]/g, '').trim();
    return firstFont;
  };

  return {
    currentFont: computed(() => currentFont.value),
    currentLineHeight: computed(() => currentLineHeight.value),
    setFont,
    getCurrentFont,
    listFonts,
    setLineHeight,
    getLineHeight,
    getRenderedFont,
    availableFonts,
  };
}

