import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { getTheme, type Theme, type ThemeName } from '../themes';
import { getDefaultFont } from '../config';

const STORAGE_KEY = 'kenzik-resume-theme';
const DEFAULT_THEME: ThemeName = 'auto';

// Reactive state
const currentThemeName = ref<ThemeName>(DEFAULT_THEME);
const systemPrefersDark = ref(false);

// Media query watcher
let mediaQuery: MediaQueryList | null = null;

function detectSystemPreference(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function setupMediaQueryWatcher() {
  if (typeof window === 'undefined') return;

  mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  systemPrefersDark.value = mediaQuery.matches;

  const handleChange = (e: MediaQueryListEvent) => {
    systemPrefersDark.value = e.matches;
  };

  // Modern browsers
  if (mediaQuery.addEventListener) {
    mediaQuery.addEventListener('change', handleChange);
  } else {
    // Fallback for older browsers
    mediaQuery.addListener(handleChange);
  }
}

function cleanupMediaQueryWatcher() {
  if (mediaQuery && mediaQuery.removeEventListener) {
    mediaQuery.removeEventListener('change', () => {});
  }
}

// Load theme preference from localStorage
function loadThemePreference(): ThemeName {
  if (typeof window === 'undefined') return DEFAULT_THEME;
  
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'dark' || stored === 'light' || stored === 'auto') {
    return stored as ThemeName;
  }
  return DEFAULT_THEME;
}

// Save theme preference to localStorage
function saveThemePreference(theme: ThemeName) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, theme);
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

  // Apply font ONLY if no custom font has been set
  const customFont = typeof window !== 'undefined' 
    ? localStorage.getItem('kenzik-resume-font')
    : null;
  
  if (!customFont || customFont === getDefaultFont()) {
    // Only apply theme font if no custom font preference
    root.style.setProperty('--font-family', theme.font.family);
  }
  
  // Always apply other font properties (size, weight)
  root.style.setProperty('--font-size', theme.font.size);
  root.style.setProperty('--font-weight', theme.font.weight || '400');
  
  // Only apply theme line-height if no custom preference
  const customLineHeight = typeof window !== 'undefined'
    ? localStorage.getItem('kenzik-resume-line-height')
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

export function useTheme() {
  // Initialize on mount
  onMounted(() => {
    currentThemeName.value = loadThemePreference();
    setupMediaQueryWatcher();
  });

  onUnmounted(() => {
    cleanupMediaQueryWatcher();
  });

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

