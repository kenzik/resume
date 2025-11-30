import { ref, computed, onMounted, nextTick, getCurrentInstance } from 'vue';
import { LocalStorage } from 'quasar';
import { fonts, getFont, getDefaultFont, getDefaultLineHeight, loadWebFont, preloadWebFonts, type FontConfig } from '../config';

const STORAGE_KEY_FONT = 'kenzik-resume-font';
const STORAGE_KEY_LINE_HEIGHT = 'kenzik-resume-line-height';

// Reactive state
const currentFont = ref<string>(getDefaultFont());
const currentLineHeight = ref<number>(getDefaultLineHeight());
const hasCustomFont = ref<boolean>(false); // Track if user manually changed font

// Load font preference from Quasar LocalStorage
function loadFontPreference(): string {
  if (typeof window === 'undefined') return getDefaultFont();
  
  const stored = LocalStorage.getItem<string>(STORAGE_KEY_FONT);
  if (stored && getFont(stored)) {
    hasCustomFont.value = true; // User has a custom preference
    return stored;
  }
  return getDefaultFont();
}

// Load line height preference from Quasar LocalStorage
function loadLineHeightPreference(): number {
  if (typeof window === 'undefined') return getDefaultLineHeight();
  
  const stored = LocalStorage.getItem<string>(STORAGE_KEY_LINE_HEIGHT);
  if (stored) {
    const parsed = parseFloat(stored);
    if (!isNaN(parsed) && parsed > 0 && parsed <= 3) {
      return parsed;
    }
  }
  return getDefaultLineHeight();
}

// Save font preference to Quasar LocalStorage
function saveFontPreference(font: string) {
  if (typeof window === 'undefined') return;
  LocalStorage.set(STORAGE_KEY_FONT, font);
  hasCustomFont.value = true; // Mark as custom
}

// Save line height preference to Quasar LocalStorage
function saveLineHeightPreference(lineHeight: number) {
  if (typeof window === 'undefined') return;
  LocalStorage.set(STORAGE_KEY_LINE_HEIGHT, lineHeight.toString());
}

// Apply font to document - IMMEDIATE application
function applyFont(fontName: string) {
  if (typeof document === 'undefined') return;

  const font = getFont(fontName);
  if (!font) {
    console.warn(`Font "${fontName}" not found in config`);
    return;
  }

  // Load web font if needed
  loadWebFont(fontName);

  const root = document.documentElement;
  root.style.setProperty('--font-family', font.family);
  
  // Force immediate reflow to ensure visual update
  void root.offsetHeight;
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
  
  // Preload all web fonts so they're ready when user switches
  preloadWebFonts();
  
  currentFont.value = loadFontPreference();
  currentLineHeight.value = loadLineHeightPreference();
  applyFont(currentFont.value);
  applyLineHeight(currentLineHeight.value);
}

export function useFont() {
  // Initialize font if not already done
  if (typeof window !== 'undefined' && !fontInitialized) {
    initializeFont();
  }

  // Only use onMounted if we're inside a Vue component context
  // This prevents warnings when useFont is called from commands
  if (getCurrentInstance()) {
    onMounted(() => {
      if (!fontInitialized) {
        nextTick(() => {
          initializeFont();
        });
      }
    });
  }

  // Set font manually - IMMEDIATE visual feedback
  const setFont = (fontName: string): boolean => {
    const font = fonts.fonts.find(f => f.name.toLowerCase() === fontName.toLowerCase());
    if (font) {
      currentFont.value = font.name;
      saveFontPreference(font.name);
      applyFont(font.name); // Apply immediately
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
    return fonts.fonts.map(f => f.name);
  };

  // Set line height - IMMEDIATE visual feedback
  const setLineHeight = (lineHeight: number): boolean => {
    if (lineHeight > 0 && lineHeight <= 3) {
      currentLineHeight.value = lineHeight;
      saveLineHeightPreference(lineHeight);
      applyLineHeight(lineHeight); // Apply immediately
      return true;
    }
    return false;
  };

  // Get current line height
  const getLineHeight = () => {
    return currentLineHeight.value;
  };

  // Check if user has set a custom font (so theme won't override it)
  const hasCustomFontPreference = () => {
    return hasCustomFont.value;
  };

  return {
    currentFont: computed(() => currentFont.value),
    currentLineHeight: computed(() => currentLineHeight.value),
    setFont,
    getCurrentFont,
    listFonts,
    setLineHeight,
    getLineHeight,
    hasCustomFontPreference,
    availableFonts: fonts.fonts,
  };
}

