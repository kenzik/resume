import { ref, computed } from 'vue';
import { LocalStorage } from 'quasar';
import { STORAGE_KEYS } from '../constants';

// Reactive state - default to enabled
const scanlinesEnabled = ref<boolean>(true);

// Load preference from LocalStorage
function loadScanlinesPreference(): boolean {
  if (typeof window === 'undefined') return true;

  const stored = LocalStorage.getItem<string>(STORAGE_KEYS.scanlines);
  if (stored !== null) {
    return stored === 'true';
  }
  return true; // Default to enabled
}

// Save preference to LocalStorage
function saveScanlinesPreference(enabled: boolean) {
  if (typeof window === 'undefined') return;
  LocalStorage.set(STORAGE_KEYS.scanlines, enabled.toString());
}

// Apply scanlines setting to document
function applyScanlines(enabled: boolean) {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  if (enabled) {
    root.classList.remove('scanlines-disabled');
  } else {
    root.classList.add('scanlines-disabled');
  }
}

// Initialize on first load
let initialized = false;

function initialize() {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;

  scanlinesEnabled.value = loadScanlinesPreference();
  applyScanlines(scanlinesEnabled.value);
}

export function useScanlines() {
  // Initialize if not already done
  if (typeof window !== 'undefined' && !initialized) {
    initialize();
  }

  const setEnabled = (enabled: boolean): void => {
    scanlinesEnabled.value = enabled;
    saveScanlinesPreference(enabled);
    applyScanlines(enabled);
  };

  const toggle = (): boolean => {
    const newValue = !scanlinesEnabled.value;
    setEnabled(newValue);
    return newValue;
  };

  const isEnabled = (): boolean => {
    return scanlinesEnabled.value;
  };

  return {
    enabled: computed(() => scanlinesEnabled.value),
    setEnabled,
    toggle,
    isEnabled,
  };
}
