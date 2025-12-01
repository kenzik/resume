import { ref, computed, watch, type InjectionKey } from 'vue';
import { LocalStorage } from 'quasar';
import { getTheme, type Theme, type ThemeName } from '../themes';
import { STORAGE_KEYS } from '../constants';

const DEFAULT_THEME: ThemeName = 'auto';

// Typed injection key for theme context
export type ThemeContext = ReturnType<typeof useTheme>;
export const THEME_KEY: InjectionKey<ThemeContext> = Symbol('theme');

// Singleton reactive state (shared across all uses)
const currentThemeName = ref<ThemeName>(DEFAULT_THEME);
const systemPrefersDark = ref(false);
const isInitialized = ref(false);

// Media query watcher
let mediaQuery: MediaQueryList | null = null;
let mediaQueryHandler: ((e: MediaQueryListEvent) => void) | null = null;

function setupMediaQueryWatcher() {
  // Prevent duplicate setup
  if (typeof window === 'undefined' || mediaQuery) return;

  mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  systemPrefersDark.value = mediaQuery.matches;

  mediaQueryHandler = (e: MediaQueryListEvent) => {
    systemPrefersDark.value = e.matches;
  };

  // Modern browsers
  if (mediaQuery.addEventListener) {
    mediaQuery.addEventListener('change', mediaQueryHandler);
  } else {
    // Fallback for older browsers
    mediaQuery.addListener(mediaQueryHandler);
  }
}

// Load theme preference from Quasar LocalStorage
function loadThemePreference(): ThemeName {
  if (typeof window === 'undefined') return DEFAULT_THEME;
  
  const stored = LocalStorage.getItem<string>(STORAGE_KEYS.theme);
  if (stored === 'dark' || stored === 'light' || stored === 'auto') {
    return stored as ThemeName;
  }
  return DEFAULT_THEME;
}

// Save theme preference to Quasar LocalStorage
function saveThemePreference(theme: ThemeName) {
  if (typeof window === 'undefined') return;
  LocalStorage.set(STORAGE_KEYS.theme, theme);
}

// Apply theme to document
function applyTheme(theme: Theme) {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  
  // Apply color variables
  Object.entries(theme.colors).forEach(([key, value]) => {
    root.style.setProperty(`--color-${key}`, value);
  });

  // Apply terminal colors
  Object.entries(theme.terminal).forEach(([key, value]) => {
    root.style.setProperty(`--terminal-${key}`, value);
  });

  // Font family is controlled by useFont composable, not themes
  // Themes only set size and weight
  root.style.setProperty('--font-size', theme.font.size);
  root.style.setProperty('--font-weight', theme.font.weight || '400');
  
  // Only apply theme line-height if no custom preference
  const customLineHeight = typeof window !== 'undefined'
    ? LocalStorage.getItem<string>(STORAGE_KEYS.lineHeight)
    : null;
  if (!customLineHeight) {
    root.style.setProperty('--font-line-height', theme.font.lineHeight);
  }

  // Apply spacing
  root.style.setProperty('--spacing-padding', theme.spacing.padding);

  // Apply background and foreground
  root.style.backgroundColor = theme.colors.background;
  root.style.color = theme.colors.foreground;
}

// Computed active theme based on preference
const activeTheme = computed<Theme>(() => {
  if (currentThemeName.value === 'auto') {
    return getTheme(systemPrefersDark.value ? 'dark' : 'light');
  }
  return getTheme(currentThemeName.value);
});

// Watch for theme changes and apply
watch(activeTheme, (theme) => {
  applyTheme(theme);
}, { immediate: true });

// Initialize theme system (idempotent - safe to call multiple times)
function initializeTheme() {
  if (isInitialized.value) return;
  
  if (typeof window !== 'undefined') {
    currentThemeName.value = loadThemePreference();
    setupMediaQueryWatcher();
    isInitialized.value = true;
  }
}

export function useTheme() {
  // Ensure initialization (idempotent - works in boot files and components)
  initializeTheme();

  // Set theme manually
  const setTheme = (theme: ThemeName) => {
    currentThemeName.value = theme;
    saveThemePreference(theme);
  };

  // Toggle between dark and light (skips auto)
  const toggleTheme = () => {
    if (currentThemeName.value === 'auto') {
      setTheme(systemPrefersDark.value ? 'light' : 'dark');
    } else if (currentThemeName.value === 'dark') {
      setTheme('light');
    } else {
      setTheme('dark');
    }
  };

  // Reset to auto
  const resetToAuto = () => {
    setTheme('auto');
  };

  return {
    currentTheme: activeTheme,
    currentThemeName: computed(() => currentThemeName.value),
    systemPrefersDark: computed(() => systemPrefersDark.value),
    setTheme,
    toggleTheme,
    resetToAuto,
    isAuto: computed(() => currentThemeName.value === 'auto'),
  };
}
